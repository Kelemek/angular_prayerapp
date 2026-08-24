import { markdownToSafeHtml } from "../../utils/markdown";
import {
  buildMemorizeVerseAppLink,
  buildSubscriberAppLink,
  buildViewPrayerAppLink,
} from "./email-notification-links";
import type {
  AdminNotificationPayload,
  ApprovedPrayerPayload,
  ApprovedUpdatePayload,
  DeniedPrayerPayload,
  DeniedUpdatePayload,
  RequesterApprovalPayload,
  UpdateAuthorApprovalPayload,
  VerseMemorizationPrayerPayload,
} from "./email-notification-types";

export function generateApprovedPrayerHTML(
  payload: ApprovedPrayerPayload,
  baseUrl: string
): string {
  const appUrl = buildSubscriberAppLink(baseUrl, payload.status);

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Prayer Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0;"><strong>For:</strong> ${
                payload.prayerFor
              }</p>
              <p style="margin: 5px 0;"><strong>Requested by:</strong> ${
                payload.requester
              }</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> ${
                payload.status
              }</p>
            </div>
            <p><strong>Description:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">${markdownToSafeHtml(
              payload.description
            )}</div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This prayer has been approved and is now active. Join us in prayer!</p>
          </div>
        </body>
      </html>
    `;
}

export function generateAnsweredPrayerHTML(
  payload: ApprovedPrayerPayload,
  baseUrl: string
): string {
  const appUrl = buildSubscriberAppLink(baseUrl, payload.status);

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Answered</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Prayer Answered!</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">✓ Answered Prayer</div>
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <div style="margin-bottom: 15px;">
              <p style="margin: 5px 0;"><strong>For:</strong> ${
                payload.prayerFor
              }</p>
              <p style="margin: 5px 0;"><strong>Requested by:</strong> ${
                payload.requester
              }</p>
            </div>
            <p><strong>Description:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">${markdownToSafeHtml(
              payload.description
            )}</div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Let's give thanks and praise for this answered prayer!</p>
          </div>
        </body>
      </html>
    `;
}

export function generateApprovedUpdateHTML(
  payload: ApprovedUpdatePayload,
  baseUrl: string
): string {
  const appUrl = buildSubscriberAppLink(baseUrl, payload.prayerStatus);
  const isAnswered = payload.markedAsAnswered || false;

  const gradientColors = isAnswered ? "#10b981, #059669" : "#3b82f6, #2563eb";
  const icon = isAnswered ? "🎉" : "💬";
  const title = isAnswered ? "Prayer Answered!" : "Prayer Update";
  const borderColor = isAnswered ? "#10b981" : "#3b82f6";
  const buttonColor = isAnswered ? "#10b981" : "#3b82f6";
  const statusBadge = isAnswered
    ? '<div style="display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">✓ Answered Prayer</div>'
    : "";
  const closingMessage = isAnswered
    ? "Let's give thanks and praise for this answered prayer!"
    : "Let's continue to lift this prayer up together.";

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, ${gradientColors}); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${icon} ${title}</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            ${statusBadge}
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${
              payload.prayerTitle
            }</h2>
            <p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> ${
              payload.author
            }</p>
            <p><strong>Update:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${borderColor};">${markdownToSafeHtml(
    payload.content
  )}</div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: ${buttonColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>${closingMessage}</p>
          </div>
        </body>
      </html>
    `;
}

export function generateRequesterApprovalHTML(
  payload: RequesterApprovalPayload,
  baseUrl: string
): string {
  const appUrl = `${baseUrl}/`;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Request Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Prayer Request Approved!</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Great news, ${
              payload.requester
            }!</h2>
            <p style="margin-bottom: 20px;">Your prayer request has been approved and is now active in our prayer community.</p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;"><strong>Your Prayer Request:</strong></p>
              <p style="margin: 0 0 5px 0; color: #065f46; font-weight: 600; font-size: 18px;">${
                payload.title
              }</p>
              <p style="margin: 0 0 10px 0; color: #047857; font-size: 14px;"><strong>Prayer for:</strong> ${
                payload.prayerFor
              }</p>
              <div style="color: #047857;">${markdownToSafeHtml(
                payload.description
              )}</div>
            </div>
            
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
                <strong>What happens next?</strong><br>
                • Your prayer is now visible to our community<br>
                • People can pray for this request and post updates<br>
                • You'll receive email notifications when updates are posted<br>
                • You can visit the app anytime to see the latest
              </p>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Thank you for sharing this prayer need with our community. We are honored to pray alongside you!</p>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Your Prayer</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>You're receiving this because you submitted a prayer request to our prayer app.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateDeniedPrayerHTML(
  payload: DeniedPrayerPayload,
  baseUrl: string
): string {
  const appUrl = `${baseUrl}/`;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Request Not Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Prayer Request Status</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <p style="margin-bottom: 15px;">Thank you for submitting your prayer request. After careful review, we are unable to approve this request at this time.</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
              <p style="margin: 10px 0 0 0; color: #991b1b;">${
                payload.denialReason
              }</p>
            </div>
            <p style="margin-top: 20px;"><strong>Your Submission:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${markdownToSafeHtml(
              payload.description
            )}</div>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateDeniedUpdateHTML(
  payload: DeniedUpdatePayload,
  baseUrl: string
): string {
  const appUrl = `${baseUrl}/`;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Prayer Update Not Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💬 Update Status</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${
              payload.prayerTitle
            }</h2>
            <p style="margin-bottom: 15px;">Thank you for submitting an update. After careful review, we are unable to approve this update at this time.</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
              <p style="margin: 10px 0 0 0; color: #991b1b;">${
                payload.denialReason
              }</p>
            </div>
            <p style="margin-top: 20px;"><strong>Your Update:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${markdownToSafeHtml(
              payload.content
            )}</div>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateUpdateAuthorApprovalHTML(
  payload: UpdateAuthorApprovalPayload,
  baseUrl: string
): string {
  const appUrl = `${baseUrl}/`;

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Update Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Update Approved</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${
              payload.prayerTitle
            }</h2>
            <p style="margin-bottom: 15px;">Great news! Your update has been approved and is now live on the prayer app.</p>
            <p style="margin-top: 20px;"><strong>Your Update:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${markdownToSafeHtml(
              payload.content
            )}</div>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Thank you for keeping our community updated on this prayer!</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateAdminNotificationPrayerHTML(
  payload: AdminNotificationPayload,
  adminLink: string
): string {
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Prayer Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <p><strong>Requested by:</strong> ${
              payload.requester || "Anonymous"
            }</p>
            <p><strong>Description:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">${
              payload.description
                ? markdownToSafeHtml(payload.description)
                : "No description provided"
            }</div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${adminLink}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateAdminNotificationUpdateHTML(
  payload: AdminNotificationPayload,
  adminLink: string
): string {
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Prayer Update</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Prayer Update</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">Update for: ${
              payload.title
            }</h2>
            <p><strong>Update by:</strong> ${payload.author || "Anonymous"}</p>
            <p><strong>Content:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">${
              payload.content
                ? markdownToSafeHtml(payload.content)
                : "No content provided"
            }</div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${adminLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateAdminNotificationDeletionHTML(
  payload: AdminNotificationPayload,
  adminLink: string
): string {
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Deletion Request</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #dc2626, #991b1b); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🗑️ Deletion Request</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
            <p><strong>Requested by:</strong> ${
              payload.requester || "Anonymous"
            }</p>
            <p><strong>Reason:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">${
              payload.reason || "No reason provided"
            }</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${adminLink}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
            </div>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>This is an automated notification from your prayer app.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateWelcomeEmailHTML(baseUrl: string): string {
  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Prayer Community</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2B2B2B; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #0047AB, #3E5266); padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Our Prayer Community! 🙏</h1>
            <p style="color: #E8E5E1; margin: 10px 0 0 0; font-size: 16px;">You're now part of something meaningful</p>
          </div>
          <div style="background: #F8F7F5; padding: 20px; border: 1px solid #D1CCC4; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="margin-bottom: 20px;">We're so glad you've joined our prayer community! You're now connected to a group of people who believe in the power of prayer and the importance of lifting each other up.</p>
            <div style="background: #E8E5E1; border-left: 4px solid #39704D; padding: 20px; border-radius: 6px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #39704D;">What You Can Do:</h3>
              <ul style="margin: 10px 0; padding-left: 20px; color: #2B2B2B;">
                <li style="margin: 8px 0;"><strong>Submit Prayer Requests</strong> - Share what's on your heart. Our community will pray for your needs, whether big or small.</li>
                <li style="margin: 8px 0;"><strong>Receive Prayer Updates</strong> - Get notified when community members share updates about their prayers, answered prayers, and God's faithfulness at work in their lives.</li>
                <li style="margin: 8px 0;"><strong>Stay Informed</strong> - Choose how often you want to hear from us. You can adjust your email preferences anytime.</li>
                <li style="margin: 8px 0;"><strong>Be Encouraged</strong> - Read stories of answered prayers and see how God is working in the lives of those around you.</li>
                <li style="margin: 8px 0;"><strong>Lift Others Up</strong> - Join in prayer for the requests that touch your heart. Your prayers make a real difference.</li>
              </ul>
            </div>
            <div style="background: #FEF9E7; border: 1px solid #C9A961; border-radius: 6px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #B8860B;"><strong>💡 Pro Tip:</strong> Check out the app to explore prayers in different categories and find people and situations you'd like to pray for.</p>
            </div>
            <h3 style="margin-top: 25px; margin-bottom: 10px; color: #2B2B2B;">Have Feedback or Questions?</h3>
            <p style="margin-bottom: 15px;">We'd love to hear from you! Whether you have suggestions to improve the app, questions about how things work, or feedback about your experience, we're all ears.</p>
            <p style="margin-bottom: 15px;"><strong>📝 Share Your Feedback:</strong> You can submit feedback directly through the app using the feedback form. Just look for the "Send Feedback" option in your user menu. Your thoughts help us create a better experience for everyone.</p>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${baseUrl}/" style="background: #39704D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Enter the Prayer App</a>
            </div>
          </div>
          <div style="margin-top: 25px; text-align: center; color: #988F83; font-size: 13px; border-top: 1px solid #D1CCC4; padding-top: 20px;">
            <p style="margin: 10px 0;"><strong>Blessings,</strong><br>Your Prayer Community Team</p>
            <p style="margin: 10px 0; font-size: 12px;">You're receiving this email because you've joined our prayer community. This is a one-time welcome message.</p>
            <p style="margin: 10px 0; font-size: 12px;">© 2024 Prayer Community. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;
}

export function generateVerseMemorizationPrayerHTML(
  payload: VerseMemorizationPrayerPayload,
  baseUrl: string
): string {
  const memorizeAppLink = buildMemorizeVerseAppLink(
    baseUrl,
    payload.verseReference,
    payload.verseTranslation
  );
  const viewPrayerAppLink = buildViewPrayerAppLink(baseUrl, payload.prayerId);
  const adminMessageHtml = payload.adminMessage?.trim()
    ? `<div style="background-color:#ffffff;padding:15px;border-radius:6px;border-left:4px solid #C9A961;margin-bottom:16px;">${markdownToSafeHtml(payload.adminMessage)}</div>`
    : "";
  const verseTextHtml = markdownToSafeHtml(payload.verseText);

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verse to Memorize</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #39704D, #2d5a3d); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📖 Verse to Memorize</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="color:#4b5563;margin:0 0 16px;">This week we invite you to memorize a passage of Scripture together. Use the Memorize button below to add this verse to your list and start practicing.</p>
            ${adminMessageHtml}
            <h2 style="color: #1f2937; margin: 16px 0 8px;">${payload.verseReference}</h2>
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #39704D; font-style: italic; color: #374151;">${verseTextHtml}</div>
            <div style="margin-top: 30px; text-align: center;">
              <a href="${memorizeAppLink}" style="background: #39704D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Memorize</a>
            </div>
            <p style="margin: 20px 0 0; text-align: center; font-size: 14px; color: #6b7280;">
              <a href="${viewPrayerAppLink}" style="color: #39704D;">View in the prayer app</a>
            </p>
          </div>
        </body>
      </html>
    `;
}
