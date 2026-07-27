'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
});
type FormValues = z.infer<typeof schema>;

export default function ContactPage() {
  const t = useTranslations('ContactPage');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Contact message was not accepted');
      setStatus('success');
      reset();
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl sm:text-5xl font-black text-gray-900 mb-4 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label={t('name_label')}
            id="name"
            placeholder="Your name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label={t('email_label')}
            id="email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('subject_label')}
            id="subject"
            placeholder="Subject"
            error={errors.subject?.message}
            {...register('subject')}
          />
          <Textarea
            label={t('message_label')}
            id="message"
            rows={6}
            placeholder="Your message..."
            error={errors.message?.message}
            {...register('message')}
          />

          {status === 'success' && (
            <p className="text-sm text-green-400">{t('success')}</p>
          )}
          {status === 'error' && (
            <p className="text-sm text-red-400">{t('error')}</p>
          )}

          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            {t('submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
