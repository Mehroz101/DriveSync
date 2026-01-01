export const getUserId = (): string | null => {
  return localStorage.getItem("userId");
};

export const clearUserSession = () => {
  localStorage.removeItem("userId");
};
export const isAuthenticated = (): boolean => {
  return getUserId() !== null;
}