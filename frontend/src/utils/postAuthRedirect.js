/** Default landing page after login, signup, or 2FA. */
export const POST_AUTH_PATH = "/dashboard";

export function getPostAuthPath(_user = null) {
  return POST_AUTH_PATH;
}
