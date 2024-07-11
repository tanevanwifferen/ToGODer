import nodemailer from 'nodemailer';

if (!process.env.SMTP_HOST) throw new Error('SMTP_HOST is not defined');
if (!process.env.SMTP_PORT) throw new Error('SMTP_PORT is not defined');
if (!process.env.SMTP_USER) throw new Error('SMTP_USER is not defined');
if (!process.env.SMTP_PASS) throw new Error('SMTP_PASS is not defined');
if (!process.env.HOST_URL) throw new Error('HOST_URL is not defined');

export class Mailer {
  public static IsValidEmailAddress(email: string) {
    var emailFormat =
      /^[a-zA-Z0-9_.+]+(?<!^[0-9]*)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    return email.match(emailFormat) !== null;
  }

  private getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  public sendMail(recipient: string, subject: string, body: string) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipient,
      subject: subject,
      text: body,
    };

    const transporter = this.getTransporter();

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }

  public sendVerificationEmail(
    recipient: string,
    userId: string,
    verificationCode: string
  ) {
    const subject = 'Verify your email address';
    const body = `Please click the following link to verify your email address: ${process.env.HOST_URL}/api/auth/verify/${userId}/${verificationCode}`;
    this.sendMail(recipient, subject, body);
  }

  public sendForgotPasswordEmail(email: string, signature: string) {
    const subject = 'Reset your password';
    const body = `Please copy this code to ToGODer toreset your password: \n\n ${signature}`;
    this.sendMail(email, subject, body);
  }
}
