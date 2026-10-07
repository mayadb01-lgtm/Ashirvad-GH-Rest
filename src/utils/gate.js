// 🔑 Chhupa login: is device par darwaza khula hai ya nahi
const KEY = "gate-v1";
export const loginUnlocked = () => {
  try {
    if (localStorage.getItem(KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  return window.__gateOpen === true;
};
export const unlockLogin = () => {
  window.__gateOpen = true;
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* private window — is baar ke liye kaafi */
  }
};
