import nodemailer from 'nodemailer'

export const sendVerificationEmail = async (email: string, token: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
  });

  const url = `http://localhost:7777/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: '"MealPlanner" <noreply@recipeapp.com>',
    to: email,
    subject: "Please verify your email",
    html: `
      <h1>Welcome to Meal Planner!</h1>
      <p>Click the link below to verify your account:</p>
      <a href="${url}">${url}</a>
    `,
  });
};