// 🔑 Login page chhupa hua: jab tak is device par "404" wala chhupa darwaza na khula ho, login ki jagah 404 dikhta hai.
// (Yeh sirf parda hai — asli suraksha password + server par hai.)
import NotFound from "../pages/NotFound";
import { loginUnlocked } from "../utils/gate";

const SecretGate = ({ children }) => (loginUnlocked() ? children : <NotFound />);

export default SecretGate;
