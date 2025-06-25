
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
import { Mail, Save, AlertTriangle, CheckCircle, Eye, Code } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RichTextEditor } from '@/components/rich-text-editor'

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
  subject: string
  body: string
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
        subject: data?.subject || '',
        body: data?.body || ''
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
        icon: <AlertTriangle />
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
        icon: <CheckCircle />
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
        icon: <AlertTriangle />
      });
    } finally {
      setSaving(false);
    }
  };
  
  const isChanged = template
    ? formData.subject !== template.subject || formData.body !== template.body
    : formData.subject !== '' || formData.body !== '';

  const loadingContent = (
    <div className='space-y-4'>
      <Skeleton className='h-10 w-1/3' />
      <Skeleton className='h-32 w-full' />
    </div>
  );

  const loadedContent = (
    <>
      <div className='space-y-2'>
        <Label htmlFor={`subject-${templateType.key}`}>Subject</Label>
        <Input
          id={`subject-${templateType.key}`}
          value={formData.subject}
          onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
          placeholder="Email subject"
          disabled={saving}
        />
      </div>
      <div className='space-y-2'>
        <Label>Body</Label>
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">
              <Eye className="mr-2 h-4 w-4" />
              Visual Editor
            </TabsTrigger>
            <TabsTrigger value="html">
              <Code className="mr-2 h-4 w-4" />
              HTML Source
            </TabsTrigger>
          </TabsList>
          <TabsContent value="visual" className="mt-2">
            <RichTextEditor
              value={formData.body}
              onChange={(value) => setFormData(p => ({ ...p, body: value }))}
              readOnly={saving}
            />
          </TabsContent>
          <TabsContent value="html" className="mt-2">
            <Textarea
              id={`body-html-${templateType.key}`}
              value={formData.body}
              onChange={(e) => setFormData(p => ({ ...p, body: e.target.value }))}
              placeholder="Enter raw HTML here."
              rows={15}
              className="min-h-[300px] font-mono text-sm"
              disabled={saving}
            />
          </TabsContent>
        </Tabs>
        <p className='text-xs text-muted-foreground'>You can use variables like {`{{.Username}}`}, {`{{.ResetLink}}`}, etc. (check API docs for available variables for each template).</p>
      </div>
    </>
  );

  return (
    <Card className="shadow-md border-0">
      <CardHeader>
        <CardTitle>{templateType.name}</CardTitle>
        <CardDescription>Edit the content for the {templateType.name.toLowerCase()} email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? loadingContent : loadedContent}
      </CardContent>
      <CardFooter className="border-t pt-6">
        <Button onClick={handleSave} disabled={saving || loading || !isChanged}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function EmailTemplatesPage() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <Mail className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground mt-1">Customize system-generated emails.</p>
        </div>
      </div>
      <Tabs defaultValue={TEMPLATE_TYPES[0].key} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7">
          {TEMPLATE_TYPES.map(t => (
            <TabsTrigger key={t.key} value={t.key}>{t.name}</TabsTrigger>
          ))}
        </TabsList>
        {TEMPLATE_TYPES.map(t => (
          <TabsContent key={t.key} value={t.key} className="mt-6">
            <TemplateEditor templateType={t} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
