import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'No description provided' }, { status: 400 });
    }

    console.log('Creating transporter...');
    
    // For debugging - let's log the environment variables (without sensitive values)
    console.log('Email config check:', {
      hasEmailUser: !!process.env.EMAIL_USER,
      hasEmailPass: !!process.env.EMAIL_PASS,
      emailService: process.env.EMAIL_SERVICE || 'gmail',
    });

    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'produceitem@gmail.com',
      subject: `feetdle bug entry - ${new Date().toLocaleDateString()}`,
      text: description,
    };

    console.log('Sending email...');
    
    // Use try/catch to get detailed error info
    try {
      await transporter.sendMail(mailOptions);
      return NextResponse.json({ message: 'Bug report sent successfully' });
    } catch (emailError) {
      console.error('Nodemailer error:', emailError);
      return NextResponse.json(
        { 
          error: 'Failed to send email',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { 
        error: 'Server error processing request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 