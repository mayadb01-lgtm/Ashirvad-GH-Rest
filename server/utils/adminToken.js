// create token and saving that in cookies
const sendAdminToken = (admin, statusCode, res) => {
  const token = admin.getJwtToken();

  // Options for cookies
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "none",
    secure: true,
  };

  const adminProfile = admin.toObject();
  delete adminProfile.password;

  res.status(statusCode).cookie("admin_token", token, options).json({
    success: true,
    admin: adminProfile,
    token,
  });
};

export default sendAdminToken;
