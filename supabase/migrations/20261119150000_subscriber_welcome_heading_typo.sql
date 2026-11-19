-- Fix subscriber_welcome heading: "Cross Point" -> "Cross Pointe" (historical seed in 20260710120000).

UPDATE public.email_templates
SET html_body = replace(html_body, 'Cross Point Prayer Community', 'Cross Pointe Prayer Community'),
    updated_at = now()
WHERE template_key = 'subscriber_welcome'
  AND html_body LIKE '%Cross Point Prayer Community%';