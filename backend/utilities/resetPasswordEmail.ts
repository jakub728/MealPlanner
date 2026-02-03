import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendResetPasswordEmail = async (email: string, token: string) => {
  const url = `https://mealplanner-bg.up.railway.app/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: " Onion Eats Meal Planner <reset@mealplanner-onion.pl>",
      to: [email],
      subject: "Resetowanie hasła - Onion Eats Meal Planner",
      html: `
        <html>
          <body>
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 12px; text-align: center;">
              <h1 style="color: #FF6347; margin-bottom: 20px;">Resetowanie hasła 🔑</h1>
              <p style="font-size: 16px; color: #444; line-height: 1.6;">
                Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w aplikacji Meal Planner. 
              </p>
              <p style="font-size: 16px; color: #444; line-height: 1.6;">
                Kliknij poniższy przycisk, aby ustawić nowe hasło. Link jest ważny przez 1 godzinę.
              </p>
              <div style="margin: 35px 0;">
                <a href="${url}" 
                   style="background-color: #2D3436; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  Zresetuj hasło
                </a>
              </div>
              <p style="font-size: 14px; color: #888;">
                Jeśli to nie Ty wysłałeś prośbę o reset hasła, po prostu zignoruj tę wiadomość. Twoje obecne hasło pozostanie bezpieczne.
              </p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
              <p style="font-size: 12px; color: #aaa;">
                Wiadomość wygenerowana automatycznie przez  Onion Eats Meal Planner Team
              </p>
            </div>
          </body>
        </html>`,
    });
  } catch (error) {
    throw error;
  }
};
