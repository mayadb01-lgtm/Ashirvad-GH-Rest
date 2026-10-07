import jwt from "jsonwebtoken";
// create token and saving that in cookies
const sendAdminToken = (admin, statusCode, res) => {
  // 🔐 Super Admin ka login 12 ghante (hotel ke computer par chhoota rahe to bhi apne aap band)
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET_KEY, { expiresIn: "12h" });

  // Options for cookies
  const options = {
    expires: new Date(Date.now() + 12 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "none",
    secure: true,
  };

  const adminProfile = admin.toObject();
  delete adminProfile.password;

  // Staff wala purana "token" cookie hata do, warna dono cookie hone pe login loop hota hai
  res.clearCookie("token", { httpOnly: true, sameSite: "none", secure: true });
  res.status(statusCode).cookie("admin_token", token, options).json({
    success: true,
    admin: adminProfile,
    token,
  });
};

export default sendAdminToken;
