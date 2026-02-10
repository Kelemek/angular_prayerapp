import { supabase } from '../lib/supabase';

export interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  approval_status: string;
  created_at: string;
  date_answered?: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    is_anonymous?: boolean;
  }>;
}

export type TimeRange = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

/**
 * Generate and download a printable prayer list for the specified time range
 */
export const downloadPrintablePrayerList = async (timeRange: TimeRange = 'month', newWindow: Window | null = null) => {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'twoweeks':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2000, 0, 1);
        break;
    }

    // Fetch ALL prayers (no date filter in query - we'll filter after combining with updates)
    const { data: allPrayers, error: prayersError } = await supabase
      .from('prayers')
      .select('*')
      .eq('approval_status', 'approved')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

    if (prayersError) {
      console.error('Error fetching prayers:', prayersError);
      alert('Failed to fetch prayers. Please try again.');
      if (newWindow) newWindow.close();
      return;
    }

    console.log(`[Print] Fetched ${allPrayers?.length || 0} approved non-closed prayers`);

    // Fetch ALL updates
    const { data: allUpdates, error: updatesError } = await supabase
      .from('prayer_updates')
      .select('*');

    if (updatesError) {
      console.error('Error fetching updates:', updatesError);
      alert('Failed to fetch prayer updates. Please try again.');
      if (newWindow) newWindow.close();
      return;
    }

    console.log(`[Print] Fetched ${allUpdates?.length || 0} total updates`);

    // Filter to only approved updates and map to prayers by prayer_id
    const updatesByPrayerId = new Map<string, any[]>();
    allUpdates?.forEach(update => {
      // Only include approved updates
      if (update.approval_status === 'approved') {
        if (!updatesByPrayerId.has(update.prayer_id)) {
          updatesByPrayerId.set(update.prayer_id, []);
        }
        updatesByPrayerId.get(update.prayer_id)!.push(update);
      }
    });

    // Attach updates to prayers
    const prayersWithUpdates = (allPrayers || []).map(prayer => ({
      ...prayer,
      prayer_updates: updatesByPrayerId.get(prayer.id) || []
    }));

    // Filter: include prayers created in range OR with updates in range
    const prayers = prayersWithUpdates.filter(prayer => {
      const prayerCreatedDate = new Date(prayer.created_at);
      
      // Include if prayer was created in time range
      if (prayerCreatedDate >= startDate && prayerCreatedDate <= endDate) {
        return true;
      }
      
      // Include if any update is in time range
      if (prayer.prayer_updates && Array.isArray(prayer.prayer_updates) && prayer.prayer_updates.length > 0) {
        const hasRecentUpdate = prayer.prayer_updates.some((update: any) => {
          const updateDate = new Date(update.created_at);
          return updateDate >= startDate && updateDate <= endDate;
        });
        if (hasRecentUpdate) {
          console.log(`[Print] Prayer "${prayer.prayer_for}" (${prayer.id}) included due to recent update on ${Math.max(...prayer.prayer_updates.map((u: any) => new Date(u.created_at).getTime()))}`);
          return true;
        }
      }
      
      return false;
    });

    console.log(`[Print] Filtered to ${prayers.length} prayers in range`);
    console.log('[Print] Prayers by status:', {
      current: prayers.filter((p: any) => p.status === 'current').length,
      answered: prayers.filter((p: any) => p.status === 'answered').length
    });

    if (!prayers || prayers.length === 0) {
      const rangeText = timeRange === 'week' ? 'week' : timeRange === 'twoweeks' ? '2 weeks' : timeRange === 'month' ? 'month' : timeRange === 'year' ? 'year' : 'database';
      alert(`No prayers found in the last ${rangeText}.`);
      if (newWindow) newWindow.close();
      return;
    }

    const html = generatePrintableHTML(prayers, timeRange);

    // Use the pre-opened window if provided (Safari compatible)
    const targetWindow = newWindow || window.open('', '_blank');
    
    if (!targetWindow) {
      // Fallback: if popup blocked, offer download
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const today = new Date().toISOString().split('T')[0];
      const rangeLabel = timeRange === 'week' ? 'week' : timeRange === 'twoweeks' ? '2weeks' : timeRange === 'month' ? 'month' : timeRange === 'year' ? 'year' : 'all';
      link.download = `prayer-list-${rangeLabel}-${today}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      alert('Prayer list downloaded. Please open the file to view and print.');
    } else {
      // Write the HTML content to the window
      targetWindow.document.open();
      targetWindow.document.write(html);
      targetWindow.document.close();
      // Switch focus to the new tab
      targetWindow.focus();
    }
  } catch (error) {
    console.error('[Print] Error generating prayer list:', error);
    alert('Failed to generate prayer list. Please try again.');
  }
}

/**
 * Generate printable HTML for prayer list
 */
function generatePrintableHTML(prayers: Prayer[], timeRange: TimeRange = 'month'): string {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const currentTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Calculate start date based on time range
  const startDate = new Date();
  
  switch (timeRange) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'twoweeks':
      startDate.setDate(startDate.getDate() - 14);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'all':
      startDate.setFullYear(2000, 0, 1);
      break;
  }
  
  const dateRange = timeRange === 'all' 
    ? `All Prayers (as of ${today})`
    : `${startDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })} - ${today}`;

  // Group prayers by status (exclude archived prayers)
  const prayersByStatus = {
    current: prayers.filter(p => p.status === 'current'),
    answered: prayers.filter(p => p.status === 'answered')
  };

  // Sort prayers within each status by most recent activity (latest update or prayer creation)
  const sortByRecentActivity = (a: Prayer, b: Prayer) => {
    const aLatestUpdate = a.prayer_updates && a.prayer_updates.length > 0
      ? Math.max(...a.prayer_updates.map(u => new Date(u.created_at).getTime()))
      : 0;
    const bLatestUpdate = b.prayer_updates && b.prayer_updates.length > 0
      ? Math.max(...b.prayer_updates.map(u => new Date(u.created_at).getTime()))
      : 0;

    const aLatestActivity = Math.max(new Date(a.created_at).getTime(), aLatestUpdate);
    const bLatestActivity = Math.max(new Date(b.created_at).getTime(), bLatestUpdate);

    return bLatestActivity - aLatestActivity;
  };

  // Apply sorting to each status group
  prayersByStatus.current.sort(sortByRecentActivity);
  prayersByStatus.answered.sort(sortByRecentActivity);

  const statusLabels = {
    current: 'Current Prayer Requests',
    answered: 'Answered Prayers'
  };

  const statusColors = {
    current: '#0047AB',
    answered: '#39704D'
  };

  let prayerSectionsHTML = '';

  // Generate sections for each status (excluding archived)
  (['current', 'answered'] as const).forEach(status => {
    const statusPrayers = prayersByStatus[status];
    if (statusPrayers.length > 0) {
      // Generate all prayer cards - CSS flex-wrap will handle the 2-column layout
      // This gives row-major ordering: 1 left, 2 right, 3 left, 4 right, etc.
      const prayersHTML = statusPrayers.map(prayer => generatePrayerHTML(prayer)).join('');

      prayerSectionsHTML += `
        <div class="status-section">
          <h2 style="color: ${statusColors[status]}; border-bottom: 2px solid ${statusColors[status]}; padding-bottom: 3px; margin-bottom: 4px; margin-top: 8px; font-size: 16px;">
            ${statusLabels[status]} (${statusPrayers.length})
          </h2>
          <div class="columns">
            ${prayersHTML}
          </div>
        </div>
      `;
    }
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer List - ${today}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
            line-height: 1.3;
            color: #222;
            background: white;
            padding: 8px;
            max-width: 1000px;
            margin: 0 auto;
            font-size: 12px;
          }

          .header {
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }

          .header-right {
            font-size: 11px;
            color: #6b7280;
            white-space: nowrap;
          }

          .header h1 {
            font-size: 16px;
            color: #1f2937;
            margin: 0;
          }

          .header .subtitle {
            font-size: 12px;
            color: #6b7280;
            font-style: italic;
          }

          .date-range {
            font-size: 11px;
            color: #4b5563;
          }

          .status-section {
            margin-bottom: 4px;
          }

          .prayer-item {
            /* keep card look but reduce ink and spacing */
            background: transparent;
            border: 1px solid #e6e6e6;
            padding: 4px 6px;
            margin-bottom: 4px;
            border-radius: 2px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .prayer-item.current {
            border-left: 3px solid #3b82f6;
          }

          .prayer-item.answered {
            border-left: 3px solid #10b981;
          }

          .prayer-item.archived {
            border-left: 3px solid #6b7280;
          }

          .prayer-number {
            display: inline-block;
            background: #3b82f6;
            color: white;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            text-align: center;
            line-height: 18px;
            font-weight: 700;
            font-size: 10px;
            margin-right: 4px;
          }

          .prayer-title {
            font-size: 13px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 3px;
            display: inline;
          }

          .prayer-for {
            font-size: 13px;
            color: #4b5563;
            margin-bottom: 3px;
            font-weight: 600;
          }

          .prayer-meta {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 3px;
            font-style: italic;
            display: flex;
            justify-content: space-between;
            gap: 6px;
            align-items: center;
          }

          .prayer-description {
            font-size: 12px;
            color: #374151;
            line-height: 1.4;
            margin-bottom: 3px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          /* Updates section - more prominent styling */
          .updates-section {
            margin-top: 6px;
            padding: 6px 8px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 4px;
            border-left: 3px solid #0ea5e9;
          }

          .updates-header {
            font-size: 11px;
            font-weight: 700;
            color: #0369a1;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .update-item {
            font-size: 11px;
            color: #1e3a5f;
            line-height: 1.4;
            margin-bottom: 3px;
            padding-left: 8px;
            border-left: 2px solid #7dd3fc;
          }

          .update-item:last-child {
            margin-bottom: 0;
          }

          .update-meta {
            font-weight: 700;
            color: #0369a1;
          }
          .columns {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .prayer-item {
            width: 100%;
          }

          @media screen and (max-width: 768px) {
            body {
              padding: 15px;
              font-size: 16px;
            }

            .header h1 {
              font-size: 24px;
            }

            .prayer-title {
              font-size: 16px;
            }

            .prayer-number {
              width: 20px;
              height: 20px;
              line-height: 20px;
              font-size: 11px;
            }

            /* Single column on mobile */
            .prayer-item {
              flex: 0 0 100%;
              max-width: 100%;
            }
          }

          @media print {
            body {
              padding: 0;
            }

            .no-print {
              display: none !important;
            }

            .prayer-item {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            h2 {
              page-break-after: avoid;
              break-after: avoid;
              margin-top: 4px;
            }
          }

          @page {
            margin: 0.5in;
            size: letter;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>🙏 Church Prayer List</h1>
            <span class="date-range">${dateRange}</span>
          </div>
          <div class="header-right">
            Generated: ${today} at ${currentTime}
          </div>
        </div>
        ${prayerSectionsHTML}
      </body>
    </html>
  `;
}

/**
 * Generate HTML for a single prayer
 */
function generatePrayerHTML(prayer: Prayer): string {
  const createdDate = new Date(prayer.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const answeredDate = prayer.date_answered 
    ? new Date(prayer.date_answered).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  // Sort updates by date (newest first)
  const updates = Array.isArray(prayer.prayer_updates) 
    ? [...prayer.prayer_updates].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];
  
  // Show updates in condensed format with minimal spacing
  const updatesHTML = updates.length > 0 ? `
    <div class="updates-section">
      <div class="updates-header">Updates (${updates.length}):</div>
      ${updates.map(update => {
        const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        const authorName = update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous');
        return `<div class="update-item"><span class="update-meta">Updated by: ${authorName} • ${updateDate}:</span> ${update.content}</div>`;
      }).join('')}
    </div>
  ` : '';

  // Place requester and date on a single line; right-side show answered date if present
  const requesterText = `Requested by ${prayer.requester || 'Anonymous'}`;
  const rightMeta = answeredDate ? `Answered on ${answeredDate}` : '';

  return `
    <div class="prayer-item ${prayer.status}">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div class="prayer-for"><strong>Prayer For:</strong> ${prayer.prayer_for}</div>
      </div>
      <div class="prayer-meta">
        <span>${requesterText} • ${createdDate}</span>
        <span>${rightMeta}</span>
      </div>
      <div class="prayer-description">${prayer.description}</div>
      ${updatesHTML}
    </div>
  `;
}
