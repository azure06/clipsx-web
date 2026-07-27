import 'server-only';

import { Resend } from 'resend';

export type ContactEmail = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

function requireEnvironment(name: 'RESEND_API_KEY' | 'RESEND_FROM' | 'RESEND_CONTACT_TO') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendContactEmail(contact: ContactEmail) {
  const resend = new Resend(requireEnvironment('RESEND_API_KEY'));
  const from = requireEnvironment('RESEND_FROM');
  const to = requireEnvironment('RESEND_CONTACT_TO');
  const message = escapeHtml(contact.message).replaceAll('\n', '<br>');

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: contact.email,
    subject: `[ClipsX contact] ${contact.subject}`,
    text: `Name: ${contact.name}\nEmail: ${contact.email}\n\n${contact.message}`,
    html: `<p><strong>Name:</strong> ${escapeHtml(contact.name)}</p><p><strong>Email:</strong> ${escapeHtml(contact.email)}</p><p><strong>Subject:</strong> ${escapeHtml(contact.subject)}</p><hr><p>${message}</p>`,
  });

  if (error) throw new Error(`Resend rejected the contact message: ${error.message}`);
}
