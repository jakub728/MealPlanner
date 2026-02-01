import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, token: string) => {
  const url = `https://mealplanner-bg.up.railway.app/api/auth/verify/${token}`;

  try {
    console.log(`Próba wysłania maila przez Resend do: ${email}`);
    
    await resend.emails.send({
      from: 'Meal Planner <noreply@mealplanner-onion.pl>', 
      to: [email],
      subject: 'Potwierdź swój adres e-mail',
      html: `
        <html>
          <body>
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 12px; text-align: center;">
              <h1 style="color: #2e7d32; margin-bottom: 20px;">Witaj w Meal Planner! 🥗</h1>
              <p style="font-size: 16px; color: #444; line-height: 1.6;">
                Dziękujemy za rejestrację. Aby móc planować swoje posiłki, musimy tylko potwierdzić, że ten adres e-mail należy do Ciebie.
              </p>
              <div style="margin: 35px 0;">
                <a href="${url}" 
                   style="background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  Potwierdzam konto
                </a>
              </div>
              <p style="font-size: 14px; color: #888;">
                Jeśli nie zakładałeś konta w naszej aplikacji, możesz bezpiecznie zignorować tę wiadomość.
              </p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;">
              <p style="font-size: 12px; color: #aaa;">
                Wiadomość wygenerowana automatycznie przez Meal Planner Team
              </p>
            </div>
          </body>
        </html>`
    });

    console.log("Mail wysłany pomyślnie przez Resend!");
  } catch (error) {
    console.error("BŁĄD RESEND:", error);
    throw error;
  }
};