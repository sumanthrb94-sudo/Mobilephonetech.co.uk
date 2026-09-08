import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthModal from '../../components/AuthModal';

/**
 * The four flows that were previously broken or missing:
 *
 *  1. Signup claimed it had sent a confirmation email and told an
 *     already-signed-in customer to sign in. Neither was true —
 *     createUserWithEmailAndPassword signs the user in and sends nothing — so
 *     a successful registration looked like a failure.
 *  2. resetPassword existed and was tested, but nothing in the UI called it.
 *     There was no way for a customer to reach it at all.
 *  3. Google sign-in against an address that already had a password ended at
 *     "use your password instead", which is a dead end for anyone who owns
 *     both. It now links the two.
 *  4. Mobile sign-in did not exist at all.
 */

const login = vi.fn();
const signup = vi.fn();
const signInWithGoogle = vi.fn();
const resetPassword = vi.fn();
const completeGoogleLink = vi.fn();
const cancelGoogleLink = vi.fn();
const signInMethodsFor = vi.fn<(email: string) => Promise<string[]>>();
const startPhoneSignIn = vi.fn();
const confirmPhoneCode = vi.fn<(code: string) => Promise<{ hasEmail: boolean }>>();
const cancelPhoneSignIn = vi.fn();
const resendVerification = vi.fn();
const linkEmailPassword = vi.fn();
let pendingLinkEmail: string | null = null;
let pendingPhone: string | null = null;

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null, session: null, isAuthenticated: false, isLoading: false,
      login, signup, signInWithGoogle, resetPassword,
      signInMethodsFor, completeGoogleLink, cancelGoogleLink, pendingLinkEmail,
      startPhoneSignIn, confirmPhoneCode, cancelPhoneSignIn, pendingPhone,
      resendVerification, linkEmailPassword,
      logout: vi.fn(), continueAsGuest: vi.fn(), refreshClaims: vi.fn(),
    }),
  };
});

function renderModal(initialMode: 'login' | 'signup' = 'login') {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  render(
    <MemoryRouter>
      <AuthModal isOpen onClose={onClose} onSuccess={onSuccess} initialMode={initialMode} />
    </MemoryRouter>,
  );
  return { onClose, onSuccess };
}

const err = (code: string) => Object.assign(new Error(code), { code });

/**
 * Fill and submit the signup form.
 *
 * The wait matters: the modal focuses its first field on a 30 ms timer, so
 * typing that starts before it fires gets torn in half — the tail of "Jordan"
 * lands in the email box and the assertion reads danjordan@example.com. Wait
 * for focus to settle and the typing is deterministic.
 */
async function signUp(email = 'jordan@example.com') {
  await waitFor(() => expect(screen.getByPlaceholderText('Email Address')).toHaveFocus());
  await userEvent.type(screen.getByPlaceholderText('Full Name'), 'Jordan');
  await userEvent.type(screen.getByPlaceholderText('Email Address'), email);
  await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter22');
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  pendingLinkEmail = null;
  pendingPhone = null;
  signInMethodsFor.mockResolvedValue([]);
  // Adding a mobile to an account that already has an email is the default
  // case; the phone-first path overrides this.
  confirmPhoneCode.mockResolvedValue({ hasEmail: true });
});

describe('signup no longer lies about a confirmation email', () => {
  it('confirms the address it really sent to, and never says "then sign in"', async () => {
    signup.mockResolvedValue(undefined);
    renderModal('signup');

    await signUp();

    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument();
    // A link really is sent now, so saying so is honest — but the customer is
    // already signed in, and the old "then sign in" was the false half.
    expect(screen.getByText(/signed in/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your inbox, then sign in/i)).not.toBeInTheDocument();
  });

  it('lets the customer shop without confirming first', async () => {
    signup.mockResolvedValue(undefined);
    const { onClose, onSuccess } = renderModal('signup');

    await signUp();

    // Verification is a courtesy, not a gate — blocking checkout on it would
    // cost more in abandoned orders than the typos it catches.
    await userEvent.click(await screen.findByRole('button', { name: /start shopping/i }));
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('resends the link on request', async () => {
    signup.mockResolvedValue(undefined);
    resendVerification.mockResolvedValue(undefined);
    renderModal('signup');

    await signUp();

    await userEvent.click(await screen.findByRole('button', { name: /send it again/i }));
    await waitFor(() => expect(resendVerification).toHaveBeenCalled());
    expect(await screen.findByText(/sent again to jordan@example.com/i)).toBeInTheDocument();
  });

  it('reports a rate-limited resend calmly', async () => {
    signup.mockResolvedValue(undefined);
    resendVerification.mockRejectedValue(new Error('too many'));
    renderModal('signup');

    await signUp();

    await userEvent.click(await screen.findByRole('button', { name: /send it again/i }));
    expect(await screen.findByText(/wait a minute/i)).toBeInTheDocument();
  });

  it('names the existing provider when the address is already registered', async () => {
    signup.mockRejectedValue(err('auth/email-already-in-use'));
    signInMethodsFor.mockResolvedValue(['google.com']);
    renderModal('signup');

    await signUp();

    // Telling them exactly which method they used is what stops the duplicate
    // account they would otherwise create with a second address.
    expect(await screen.findByText(/registered with Google/i)).toBeInTheDocument();
  });
});

describe('forgot password is reachable', () => {
  it('offers the link on the sign-in form', () => {
    renderModal('login');
    expect(screen.getByRole('button', { name: /forgot your password/i })).toBeInTheDocument();
  });

  it('sends a reset and confirms without revealing whether the account exists', async () => {
    resetPassword.mockResolvedValue(undefined);
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /forgot your password/i }));
    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    // Asking for a password here would be asking for the thing they lack.
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Email or username'), 'jordan@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('jordan@example.com'));
    // "If an account exists" — confirming it does would turn this form into a
    // way of testing which addresses from a leaked list shop here.
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
  });

  it('resolves a bare staff username to the staff domain', async () => {
    resetPassword.mockResolvedValue(undefined);
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /forgot your password/i }));
    await userEvent.type(screen.getByPlaceholderText('Email or username'), 'admin');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('admin@lehart.co.uk'));
  });

  it('goes back to sign in', async () => {
    renderModal('login');
    await userEvent.click(screen.getByRole('button', { name: /forgot your password/i }));
    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }));

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});

describe('linking Google to an existing password account', () => {
  it('asks for the existing password instead of dead-ending', async () => {
    signInWithGoogle.mockResolvedValue('needs-link');
    pendingLinkEmail = 'jordan@example.com';
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByRole('heading', { name: /connect your google account/i })).toBeInTheDocument();
    expect(screen.getByText(/jordan@example.com already has a password/i)).toBeInTheDocument();
    // The address is already known, so re-asking for it would be busywork.
    expect(screen.queryByPlaceholderText('Email or username')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your existing password')).toBeInTheDocument();
  });

  it('links and signs in when the password is right', async () => {
    signInWithGoogle.mockResolvedValue('needs-link');
    completeGoogleLink.mockResolvedValue(undefined);
    pendingLinkEmail = 'jordan@example.com';
    const { onClose, onSuccess } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await userEvent.type(await screen.findByPlaceholderText('Your existing password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: /connect and sign in/i }));

    await waitFor(() => expect(completeGoogleLink).toHaveBeenCalledWith('hunter22'));
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('reports a wrong password without abandoning the link', async () => {
    signInWithGoogle.mockResolvedValue('needs-link');
    completeGoogleLink.mockRejectedValue(err('auth/wrong-password'));
    pendingLinkEmail = 'jordan@example.com';
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await userEvent.type(await screen.findByPlaceholderText('Your existing password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /connect and sign in/i }));

    expect(await screen.findByText(/does not match the existing account/i)).toBeInTheDocument();
    // Still in link mode, so one typo does not cost them the held credential.
    expect(screen.getByRole('heading', { name: /connect your google account/i })).toBeInTheDocument();
  });

  it('releases the held credential when the user backs out', async () => {
    signInWithGoogle.mockResolvedValue('needs-link');
    pendingLinkEmail = 'jordan@example.com';
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await userEvent.click(await screen.findByRole('button', { name: /cancel and sign in another way/i }));

    expect(cancelGoogleLink).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('hides the Google button while linking, so it cannot loop', async () => {
    signInWithGoogle.mockResolvedValue('needs-link');
    pendingLinkEmail = 'jordan@example.com';
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await screen.findByRole('heading', { name: /connect your google account/i });

    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });
});

describe('sign-in failures point at the right method', () => {
  it('says the account is a Google one rather than "invalid credentials"', async () => {
    login.mockRejectedValue(err('auth/invalid-credential'));
    signInMethodsFor.mockResolvedValue(['google.com']);
    renderModal('login');

    await userEvent.type(screen.getByPlaceholderText('Email or username'), 'jordan@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'guess');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/registered with Google/i)).toBeInTheDocument();
  });

  it('falls back to generic wording when enumeration protection hides the methods', async () => {
    login.mockRejectedValue(err('auth/invalid-credential'));
    // Firebase returns [] with Email Enumeration Protection on, which is the
    // default. [] means "cannot tell", never "no account".
    signInMethodsFor.mockResolvedValue([]);
    renderModal('login');

    await userEvent.type(screen.getByPlaceholderText('Email or username'), 'jordan@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'guess');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(screen.queryByText(/registered with/i)).not.toBeInTheDocument();
  });

  it('names the rate limit rather than showing a raw Firebase string', async () => {
    login.mockRejectedValue(err('auth/too-many-requests'));
    renderModal('login');

    await userEvent.type(screen.getByPlaceholderText('Email or username'), 'jordan@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'guess');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
  });
});

describe('mobile sign-in', () => {
  it('is offered on the sign-in form', () => {
    renderModal('login');
    expect(screen.getByRole('button', { name: /continue with mobile/i })).toBeInTheDocument();
  });

  it('mounts the reCAPTCHA container Firebase requires', () => {
    const { container } = render(
      <MemoryRouter><AuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} /></MemoryRouter>,
    );
    // Without this element in the DOM, signInWithPhoneNumber throws before any
    // SMS is sent.
    expect(container.querySelector('#auth-recaptcha-container')).toBeTruthy();
  });

  it('asks for a number, then a code', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    expect(screen.getByRole('heading', { name: /sign in with your mobile/i })).toBeInTheDocument();
    // No password anywhere in this flow — that is the point of it.
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    await waitFor(() => expect(startPhoneSignIn).toHaveBeenCalledWith('07700900123', 'auth-recaptcha-container', '44'));
    expect(await screen.findByRole('heading', { name: /enter your code/i })).toBeInTheDocument();
  });

  it('rejects a junk number before spending an SMS', async () => {
    renderModal('login');
    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '12');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    expect(await screen.findByText(/does not look like a mobile number/i)).toBeInTheDocument();
    expect(startPhoneSignIn).not.toHaveBeenCalled();
  });

  // A real failure, from a real test from India: 9700144003 was rewritten to
  // +449700144003 — a number that exists nowhere — and Firebase answered with
  // auth/internal-error, which named neither the country nor the rewrite.
  it('sends an Indian number to +91, not +44', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.selectOptions(screen.getByLabelText(/country/i), 'IN');
    await userEvent.type(screen.getByPlaceholderText('97001 44003'), '9700144003');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    await waitFor(() => expect(startPhoneSignIn).toHaveBeenCalledWith('9700144003', 'auth-recaptcha-container', '91'));
  });

  it('refuses an Indian number left on the UK country, rather than texting nobody', async () => {
    renderModal('login');
    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '9700144003');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    expect(await screen.findByText(/not a united kingdom mobile number/i)).toBeInTheDocument();
    expect(startPhoneSignIn).not.toHaveBeenCalled();
  });

  it('names the real cause when Firebase refuses to send', async () => {
    startPhoneSignIn.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/quota-exceeded' }));
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    // Not "check the number" — the number was fine.
    expect(await screen.findByText(/daily limit for text messages/i)).toBeInTheDocument();
  });

  it('verifies the code and signs in', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    confirmPhoneCode.mockResolvedValue({ hasEmail: true });
    pendingPhone = '+447700900123';
    const { onClose, onSuccess } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    await userEvent.type(await screen.findByPlaceholderText('123456'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await waitFor(() => expect(confirmPhoneCode).toHaveBeenCalledWith('123456'));
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a short code without calling Firebase', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    await userEvent.type(await screen.findByPlaceholderText('123456'), '123');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(await screen.findByText(/6-digit code/i)).toBeInTheDocument();
    expect(confirmPhoneCode).not.toHaveBeenCalled();
  });

  it('strips non-digits as the code is typed', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    renderModal('login');
    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    const field = await screen.findByPlaceholderText('123456');
    await userEvent.type(field, '12a34b56');
    expect((field as HTMLInputElement).value).toBe('123456');
  });

  it('explains a number already tied to another account', async () => {
    startPhoneSignIn.mockRejectedValue(err('auth/credential-already-in-use'));
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    // Silently switching them to the other account would look like their data
    // vanished, so the message says what happened instead.
    expect(await screen.findByText(/already on another account/i)).toBeInTheDocument();
  });

  it('names an expired or wrong code precisely', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    confirmPhoneCode.mockRejectedValue(err('auth/invalid-verification-code'));
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await userEvent.type(await screen.findByPlaceholderText('123456'), '999999');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(await screen.findByText(/code is not right/i)).toBeInTheDocument();
  });

  it('lets the user go back and resend', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await userEvent.click(await screen.findByRole('button', { name: /send again/i }));

    expect(cancelPhoneSignIn).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /sign in with your mobile/i })).toBeInTheDocument();
  });

  it('releases the pending verification when switching back to email', async () => {
    renderModal('login');
    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.click(screen.getByRole('button', { name: /use email instead/i }));

    expect(cancelPhoneSignIn).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });
});

describe('each signup route asks for the other contact method', () => {
  it('offers a mobile field once an email account is created', async () => {
    signup.mockResolvedValue(undefined);
    renderModal('signup');
    await signUp();

    await screen.findByRole('heading', { name: /check your email/i });
    // Attaching the number now is what makes a later phone sign-in LINK to
    // this account rather than mint a second one.
    expect(screen.getByPlaceholderText('07700 900123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /text me a code/i })).toBeInTheDocument();
  });

  it('lets the customer skip the mobile and shop anyway', async () => {
    signup.mockResolvedValue(undefined);
    const { onClose } = renderModal('signup');
    await signUp();

    // Mandatory would cost more signups than the duplicates it prevents.
    await userEvent.click(await screen.findByRole('button', { name: /start shopping/i }));
    expect(onClose).toHaveBeenCalled();
    expect(startPhoneSignIn).not.toHaveBeenCalled();
  });

  it('sends a code for the mobile added after an email signup', async () => {
    signup.mockResolvedValue(undefined);
    startPhoneSignIn.mockResolvedValue(undefined);
    renderModal('signup');
    await signUp();

    await userEvent.type(await screen.findByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    await waitFor(() => expect(startPhoneSignIn).toHaveBeenCalledWith('07700900123', 'auth-recaptcha-container', '44'));
    expect(await screen.findByRole('heading', { name: /enter your code/i })).toBeInTheDocument();
  });

  it('rejects a bad number on that step without sending', async () => {
    signup.mockResolvedValue(undefined);
    renderModal('signup');
    await signUp();

    await userEvent.type(await screen.findByPlaceholderText('07700 900123'), '12');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    expect(await screen.findByText(/does not look like a mobile number/i)).toBeInTheDocument();
    expect(startPhoneSignIn).not.toHaveBeenCalled();
  });

  it('asks a phone-first account for an email, since it has nowhere to write', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    // No email on the new account — it cannot receive an order confirmation.
    confirmPhoneCode.mockResolvedValue({ hasEmail: false });
    pendingPhone = '+447700900123';
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await userEvent.type(await screen.findByPlaceholderText('123456'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    expect(await screen.findByRole('heading', { name: /add your details/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
    // Collected here too, or the greeting and every order confirmation are
    // addressed to a masked phone number.
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
  });

  it('closes instead when the phone was added to an account that has an email', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    confirmPhoneCode.mockResolvedValue({ hasEmail: true });
    pendingPhone = '+447700900123';
    const { onClose } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await userEvent.type(await screen.findByPlaceholderText('123456'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    // Nothing left to collect.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: /add your details/i })).not.toBeInTheDocument();
  });

  it('links the email a phone-first account supplies', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    confirmPhoneCode.mockResolvedValue({ hasEmail: false });
    linkEmailPassword.mockResolvedValue(undefined);
    pendingPhone = '+447700900123';
    const { onClose } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await userEvent.type(await screen.findByPlaceholderText('123456'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await userEvent.type(await screen.findByPlaceholderText('Full Name'), 'Jordan Blake');
    await userEvent.type(screen.getByPlaceholderText('Email Address'), 'jordan@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: /save and finish/i }));

    await waitFor(() =>
      expect(linkEmailPassword).toHaveBeenCalledWith('jordan@example.com', 'hunter22', 'Jordan Blake'));
    expect(onClose).toHaveBeenCalled();
  });

  it('explains when that email already belongs to someone', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    confirmPhoneCode.mockResolvedValue({ hasEmail: false });
    linkEmailPassword.mockRejectedValue(err('auth/email-already-in-use'));
    pendingPhone = '+447700900123';
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await userEvent.type(await screen.findByPlaceholderText('123456'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await userEvent.type(await screen.findByPlaceholderText('Full Name'), 'Jordan Blake');
    await userEvent.type(screen.getByPlaceholderText('Email Address'), 'taken@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter22');
    await userEvent.click(screen.getByRole('button', { name: /save and finish/i }));

    expect(await screen.findByText(/already has an account/i)).toBeInTheDocument();
  });

  it('lets a phone-first account skip the email too', async () => {
    startPhoneSignIn.mockResolvedValue(undefined);
    confirmPhoneCode.mockResolvedValue({ hasEmail: false });
    pendingPhone = '+447700900123';
    const { onClose } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with mobile/i }));
    await userEvent.type(screen.getByPlaceholderText('07700 900123'), '07700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await userEvent.type(await screen.findByPlaceholderText('123456'), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and sign in/i }));

    await userEvent.click(await screen.findByRole('button', { name: /skip for now/i }));
    expect(onClose).toHaveBeenCalled();
    expect(linkEmailPassword).not.toHaveBeenCalled();
  });
});

/**
 * Google is the one signup route that used to close the modal on the spot.
 *
 * Email signup offers a mobile on the verify screen and phone signup asks for
 * an email, but Google did neither — it signed the customer in and closed. A
 * Google account carries a verified address and never a number, so that left
 * exactly the account whose owner later taps "sign in with mobile" and, since
 * Firebase treats a number as an identity in its own right, receives a second
 * uid with a second order history. Nothing in the application can detect it
 * afterwards, and the customer's warranty claim sits under an order they can
 * no longer see. Asking once, here, is the only moment linking is free.
 */
describe('Google sign-in collects the number it never provides', () => {
  it('asks for a mobile instead of closing when the account has none', async () => {
    signInWithGoogle.mockResolvedValue('signed-in-needs-phone');
    const { onClose } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByRole('heading', { name: /add your mobile/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    // Signed in already — asking for either of these again would be busywork.
    expect(screen.queryByPlaceholderText('Email or username')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
  });

  it('closes without asking when Google already carries a number', async () => {
    signInWithGoogle.mockResolvedValue('signed-in');
    const { onClose, onSuccess } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalled();
    // A returning customer must not be nagged for a number they already gave.
    expect(screen.queryByRole('heading', { name: /add your mobile/i })).not.toBeInTheDocument();
  });

  it('sends a code to the number given, to link rather than sign in', async () => {
    signInWithGoogle.mockResolvedValue('signed-in-needs-phone');
    startPhoneSignIn.mockResolvedValue(undefined);
    renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await userEvent.type(await screen.findByPlaceholderText(/7700 900123/i), '7700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));

    await waitFor(() => expect(startPhoneSignIn).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: /enter your code/i })).toBeInTheDocument();
  });

  it('lets the customer skip, since a mandatory number costs more signups', async () => {
    signInWithGoogle.mockResolvedValue('signed-in-needs-phone');
    const { onClose, onSuccess } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await userEvent.click(await screen.findByRole('button', { name: /skip for now/i }));

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('abandoning the code step closes rather than dropping them at sign-in', async () => {
    signInWithGoogle.mockResolvedValue('signed-in-needs-phone');
    startPhoneSignIn.mockResolvedValue(undefined);
    const { onClose } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await userEvent.type(await screen.findByPlaceholderText(/7700 900123/i), '7700900123');
    await userEvent.click(screen.getByRole('button', { name: /text me a code/i }));
    await screen.findByRole('heading', { name: /enter your code/i });

    // They are already signed in. Offering "use email instead" here would send
    // an authenticated customer back to a sign-in form.
    await userEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(onClose).toHaveBeenCalled();
  });
});

/**
 * Asked once, not every visit.
 *
 * The prompt is gated on the profile having just been created rather than on
 * the number still being absent: a customer who declined has answered the
 * question, and re-asking on every sign-in is nagging. AuthContext decides
 * this — signInWithGoogle only reports 'signed-in-needs-phone' on a first
 * sign-in — so the modal simply does what it is told.
 */
describe('a returning customer is not asked again', () => {
  it('closes for a returning Google customer who has no number', async () => {
    // Not a first sign-in, so the context reports a plain success even though
    // the account still carries no number.
    signInWithGoogle.mockResolvedValue('signed-in');
    const { onClose } = renderModal('login');

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: /add your mobile/i })).not.toBeInTheDocument();
  });
});
