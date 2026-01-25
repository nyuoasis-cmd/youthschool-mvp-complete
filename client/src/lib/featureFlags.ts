const parseBooleanEnv = (value?: string) => {
  if (!value) return false;
  return value.toLowerCase() === "true" || value === "1";
};

export const IS_EMAIL_VERIFICATION_ENABLED = parseBooleanEnv(
  import.meta.env.VITE_EMAIL_VERIFICATION_ENABLED
);
