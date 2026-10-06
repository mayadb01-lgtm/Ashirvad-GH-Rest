// Password box with 👁 show/hide button, taaki type karte waqt galti dikh jaaye.
import { useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

// eslint-disable-next-line no-unused-vars
const PasswordField = ({ type, InputProps, slotProps, ...props }) => {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? "text" : "password"}
      slotProps={{
        ...slotProps,
        input: {
          ...InputProps,
          ...(slotProps?.input || {}),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={show ? "Password chhupao" : "Password dikhao"}
                title={show ? "Password chhupao" : "Password dikhao"}
                onClick={() => setShow((s) => !s)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
              >
                {show ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default PasswordField;
