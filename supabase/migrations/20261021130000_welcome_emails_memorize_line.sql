-- Mention Memorize in subscriber and group welcome emails.

UPDATE public.email_templates
SET
  html_body = replace(
    html_body,
    '<li style="margin:8px 0;"><strong>Prayer Prompts</strong> – Explore the Prompts for ideas of what to pray for.</li>',
    '<li style="margin:8px 0;"><strong>Prayer Prompts</strong> – Explore the Prompts for ideas of what to pray for.</li>
                  <li style="margin:8px 0;"><strong>Memorize Scripture</strong> – Open the Memorize tab to practice verses and Bible books with guided exercises.</li>'
  ),
  updated_at = now()
WHERE template_key = 'subscriber_welcome'
  AND html_body LIKE '%Prayer Prompts%'
  AND html_body NOT LIKE '%Memorize Scripture%';

UPDATE public.email_templates
SET
  html_body = replace(
    html_body,
    '<li style="margin:8px 0;"><strong>Use Pray</strong> – Focus on one request at a time.</li>',
    '<li style="margin:8px 0;"><strong>Use Pray</strong> – Focus on one request at a time.</li>
                  <li style="margin:8px 0;"><strong>Memorize Scripture</strong> – Open the Memorize tab to practice verses and Bible books with guided exercises.</li>'
  ),
  text_body = replace(
    text_body,
    E'- Use Pray for focused prayer time',
    E'- Use Pray for focused prayer time
- Memorize Scripture on the Memorize tab (verses and Bible books with guided exercises)'
  ),
  updated_at = now()
WHERE template_key = 'group_welcome'
  AND html_body LIKE '%Use Pray%'
  AND html_body NOT LIKE '%Memorize Scripture%';
