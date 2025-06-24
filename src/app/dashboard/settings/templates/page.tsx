
"use client"

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getEmailTemplate, updateEmailTemplate } from "@/lib/api"
import { getCoreApiErrorMessage } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Mail, Save, AlertTriangle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TEMPLATE_TYPES = [
  { key: 'enable_user', name: 'Enable User' },
  { key: 'disable_user', name: 'Disable User' },
  { key: 'expiration', name: 'User Expiration' },
  { key: 'reset_otp', name: 'Reset OTP' },
  { key: 'change_password', name: 'Change Password' },
  { key: 'create_user_local', name: 'Create Local User' },
  { key: 'create_user_ldap', name: 'Create LDAP User' },
]

interface TemplateData {
  Subject: string
  Body: string
}

function TemplateEditor({ templateType }: { templateType: { key: string, name: string } }) {
  const [template, setTemplate] = React.useState<TemplateData | null>(null);
  const [formData, setFormData] = React.useState({ subject: '', body: '' });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchTemplate = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmailTemplate(templateType.key);
      setTemplate(data);
      setFormData({
        subject: data?.Subject || '',
        body: data?.Body || ''
      });
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: `Error fetching ${templateType.name} template`,
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: React.createElement(AlertTriangle)
      });
    } finally {
      setLoading(false);
    }
  }, [templateType.key, templateType.name, toast, router]);

  React.useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmailTemplate(templateType.key, formData);
      toast({
        title: "Template Saved",
        description: `The ${templateType.name} template has been updated.`,
        variant: "success",
        icon: React.createElement(CheckCircle)
      });
      fetchTemplate(); // Re-fetch to confirm save
    } catch (error: any) {
      if (error.message === "ACCESS_DENIED") {
        router.push('/403');
        return;
      }
      toast({
        title: `Error saving ${templateType.name} template`,
        description: getCoreApiErrorMessage(error),
        variant: "destructive",
        icon: React.createElement(AlertTriangle)
      });
    } finally {
      setSaving(false);
    }
  };
  
  const isChanged = template ? (formData.subject !== template.Subject || formData.body !== template.Body) : (formData.subject !== '' || formData.body !== '');

  const loadingContent = React.createElement('div', { className: 'space-y-4' },
    React.createElement(Skeleton, { className: 'h-10 w-1/3' }),
    React.createElement(Skeleton, { className: 'h-32 w-full' })
  );

  const loadedContent = React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'space-y-2' },
      React.createElement(Label, { htmlFor: `subject-${templateType.key}` }, 'Subject'),
      React.createElement(Input, {
        id: `subject-${templateType.key}`,
        value: formData.subject,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, subject: e.target.value })),
        placeholder: "Email subject",
        disabled: saving
      })
    ),
    React.createElement('div', { className: 'space-y-2' },
      React.createElement(Label, { htmlFor: `body-${templateType.key}` }, 'Body'),
      React.createElement(Textarea, {
        id: `body-${templateType.key}`,
        value: formData.body,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(p => ({ ...p, body: e.target.value })),
        placeholder: "Email body. You can use HTML.",
        rows: 15,
        className: "min-h-[300px]",
        disabled: saving
      }),
       React.createElement('p', { className: 'text-xs text-muted-foreground' }, "You can use variables like {{.Username}}, {{.ResetLink}}, etc. (check API docs for available variables for each template).")
    )
  );

  return React.createElement(Card, { className: "shadow-md border-0" },
    React.createElement(CardHeader, null,
      React.createElement(CardTitle, null, templateType.name),
      React.createElement(CardDescription, null, `Edit the content for the ${templateType.name.toLowerCase()} email.`)
    ),
    React.createElement(CardContent, { className: "space-y-4" },
      loading ? loadingContent : loadedContent
    ),
    React.createElement(CardFooter, { className: "border-t pt-6" },
      React.createElement(Button, { onClick: handleSave, disabled: saving || loading || !isChanged },
        React.createElement(Save, { className: "mr-2 h-4 w-4" }),
        saving ? 'Saving...' : 'Save Template'
      )
    )
  );
}

export default function EmailTemplatesPage() {
  return React.createElement('div', { className: 'space-y-6' },
    React.createElement('div', { className: 'flex items-center gap-3' },
      React.createElement(Mail, { className: "h-8 w-8 text-primary" }),
      React.createElement('div', null,
        React.createElement('h1', { className: "text-3xl font-bold tracking-tight" }, 'Email Templates'),
        React.createElement('p', { className: "text-muted-foreground mt-1" }, 'Customize system-generated emails.')
      )
    ),
    React.createElement(Tabs, { defaultValue: TEMPLATE_TYPES[0].key, className: "w-full" },
      React.createElement(TabsList, { className: "grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-4" },
        TEMPLATE_TYPES.map(t => (
          React.createElement(TabsTrigger, { key: t.key, value: t.key }, t.name)
        ))
      ),
      TEMPLATE_TYPES.map(t => (
        React.createElement(TabsContent, { key: t.key, value: t.key, className: "mt-6" },
          React.createElement(TemplateEditor, { templateType: t })
        )
      ))
    )
  )
}
