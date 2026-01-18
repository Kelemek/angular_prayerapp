import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PrayerService } from './prayer.service';

export interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  date_answered?: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
}

export type TimeRange = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  constructor(private supabase: SupabaseService, private prayerService: PrayerService) {}

  /**
   * Generate and download a printable prayer list for the specified time range
   */
  async downloadPrintablePrayerList(timeRange: TimeRange = 'month', newWindow: Window | null = null): Promise<void> {
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
      const { data: allPrayers, error: prayersError } = await this.supabase.client
        .from('prayers')
        .select('*')
        .eq('approval_status', 'approved')
        .neq('status', 'closed')
        .order('created_at', { ascending: false });

      if (prayersError) {
        console.error('[PrintService] Error fetching prayers:', prayersError);
        alert('Failed to fetch prayers. Please try again.');
        if (newWindow) newWindow.close();
        return;
      }

      // Fetch ALL updates
      const { data: allUpdates, error: updatesError } = await this.supabase.client
        .from('prayer_updates')
        .select('*');

      if (updatesError) {
        console.error('[PrintService] Error fetching updates:', updatesError);
        alert('Failed to fetch prayer updates. Please try again.');
        if (newWindow) newWindow.close();
        return;
      }

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
            return true;
          }
        }
        
        return false;
      });

      if (!prayers || prayers.length === 0) {
        const rangeText = timeRange === 'week' ? 'week' : timeRange === 'twoweeks' ? '2 weeks' : timeRange === 'month' ? 'month' : timeRange === 'year' ? 'year' : 'database';
        alert(`No prayers found in the last ${rangeText}.`);
        if (newWindow) newWindow.close();
        return;
      }

      const html = this.generatePrintableHTML(prayers, timeRange);

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
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating prayer list:', error);
      alert('Failed to generate prayer list. Please try again.');
    }
  }

  /**
   * Generate printable HTML for prayer list
   */
  private generatePrintableHTML(prayers: Prayer[], timeRange: TimeRange = 'month'): string {
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

    // Group prayers by status
    const prayersByStatus = {
      current: prayers.filter(p => p.status === 'current'),
      answered: prayers.filter(p => p.status === 'answered')
    };

    // Sort prayers within each status by most recent activity
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

    // Generate sections for each status
    (['current', 'answered'] as const).forEach(status => {
      const statusPrayers = prayersByStatus[status];
      if (statusPrayers.length > 0) {
        const prayersHTML = statusPrayers.map(prayer => this.generatePrayerHTML(prayer)).join('');
        
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

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for a single prayer
   */
  private generatePrayerHTML(prayer: Prayer): string {
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
    const sortedUpdates = Array.isArray(prayer.prayer_updates) 
      ? [...prayer.prayer_updates].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      : [];
    
    // Get updates from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUpdates = sortedUpdates.filter(update => 
      new Date(update.created_at).getTime() > oneWeekAgo.getTime()
    );
    
    // If there are updates less than 1 week old, show all of them
    // Otherwise, show only the most recent update
    const updates = recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
    
    // Show updates in condensed format with minimal spacing
    const updatesHTML = updates.length > 0 ? `
      <div class="updates-section">
        <div class="updates-header">Updates (${updates.length}):</div>
        ${updates.map(update => {
          const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          return `<div class="update-item"><span class="update-meta">Updated by: ${this.escapeHtml(update.author || 'Anonymous')} • ${updateDate}:</span> ${this.escapeHtml(update.content)}</div>`;
        }).join('')}
      </div>
    ` : '';

    // Place requester and date on a single line; right-side show answered date if present
    const requesterText = `Requested by ${this.escapeHtml(prayer.requester || 'Anonymous')}`;
    const rightMeta = answeredDate ? `Answered on ${answeredDate}` : '';

    return `
      <div class="prayer-item ${prayer.status}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="prayer-for"><strong>Prayer For:</strong> ${this.escapeHtml(prayer.prayer_for)}</div>
        </div>
        <div class="prayer-meta">
          <span>${requesterText} • ${createdDate}</span>
          <span>${rightMeta}</span>
        </div>
        <div class="prayer-description">${this.escapeHtml(prayer.description)}</div>
        ${updatesHTML}
      </div>
    `;
  }

  /**
   * Generate and download a printable prayer prompts list
   * @param selectedTypes - Array of type names to filter by. Empty array means all types.
   * @param newWindow - Pre-opened window for Safari compatibility
   */
  async downloadPrintablePromptList(selectedTypes: string[] = [], newWindow: Window | null = null): Promise<void> {
    try {
      // Fetch all prayer prompts
      const { data: promptsData, error: promptsError } = await this.supabase.client
        .from('prayer_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (promptsError) {
        console.error('Error fetching prompts:', promptsError);
        alert('Failed to fetch prayer prompts. Please try again.');
        if (newWindow) newWindow.close();
        return;
      }

      if (!promptsData || promptsData.length === 0) {
        alert('No prayer prompts found.');
        if (newWindow) newWindow.close();
        return;
      }

      // Fetch prayer types for ordering
      const { data: typesData, error: typesError } = await this.supabase.client
        .from('prayer_types')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (typesError) {
        console.error('Error fetching prayer types:', typesError);
        // Continue with default alphabetical sorting if types fetch fails
      }

      // Create a map of type name to display_order
      const typeOrderMap = new Map(typesData?.map((t: any) => [t.name, t.display_order]) || []);

      // Filter prompts by selected types (if any are selected)
      const filteredPrompts = selectedTypes.length > 0
        ? promptsData.filter((p: any) => selectedTypes.includes(p.type))
        : promptsData;

      if (filteredPrompts.length === 0) {
        alert('No prayer prompts found for the selected types.');
        if (newWindow) newWindow.close();
        return;
      }

      // Sort prompts by type's display_order
      const sortedPrompts = filteredPrompts.sort((a: any, b: any) => {
        const orderA = typeOrderMap.get(a.type) ?? 999;
        const orderB = typeOrderMap.get(b.type) ?? 999;
        return (orderA as number) - (orderB as number);
      });

      const html = this.generatePromptsPrintableHTML(sortedPrompts);

      // Use the pre-opened window if provided (Safari compatible)
      const targetWindow = newWindow || window.open('', '_blank');
      
      if (!targetWindow) {
        // Fallback: if popup blocked, offer download
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        
        const today = new Date().toISOString().split('T')[0];
        link.download = `prayer-prompts-${today}.html`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        alert('Prayer prompts downloaded. Please open the file to view and print.');
      } else {
        // Write the HTML content to the window
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        // Switch focus to the new tab
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating prayer prompts list:', error);
      alert('An error occurred while generating the prayer prompts list.');
      if (newWindow) newWindow.close();
    }
  }

  /**
   * Generate and download a printable list of personal prayers
   */
  async downloadPrintablePersonalPrayerList(timeRange: TimeRange = 'month', newWindow: Window | null = null): Promise<void> {
    try {
      // Fetch personal prayers using the prayer service
      const allPersonalPrayers = await this.prayerService.getPersonalPrayers();
      
      if (!allPersonalPrayers || allPersonalPrayers.length === 0) {
        alert('No personal prayers found.');
        if (newWindow) newWindow.close();
        return;
      }

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

      // Filter: include prayers created in range OR with updates in range
      const personalPrayers = allPersonalPrayers.filter((prayer: any) => {
        const prayerCreatedDate = new Date(prayer.created_at);
        
        // Include if prayer was created in time range
        if (prayerCreatedDate >= startDate && prayerCreatedDate <= endDate) {
          return true;
        }
        
        // Include if any update is in time range
        if (prayer.updates && Array.isArray(prayer.updates) && prayer.updates.length > 0) {
          const hasRecentUpdate = prayer.updates.some((update: any) => {
            const updateDate = new Date(update.created_at);
            return updateDate >= startDate && updateDate <= endDate;
          });
          if (hasRecentUpdate) {
            return true;
          }
        }
        
        return false;
      });

      if (personalPrayers.length === 0) {
        const rangeText = timeRange === 'week' ? 'week' : timeRange === 'twoweeks' ? '2 weeks' : timeRange === 'month' ? 'month' : timeRange === 'year' ? 'year' : 'database';
        alert(`No personal prayers found in the last ${rangeText}.`);
        if (newWindow) newWindow.close();
        return;
      }

      const html = this.generatePersonalPrayersPrintableHTML(personalPrayers, timeRange);

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
        link.download = `personal-prayers-${rangeLabel}-${today}.html`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        alert('Personal prayers downloaded. Please open the file to view and print.');
      } else {
        // Write the HTML content to the window
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        targetWindow.focus();
      }
    } catch (error) {
      console.error('Error generating personal prayers list:', error);
      alert('Failed to generate personal prayers list. Please try again.');
      if (newWindow) newWindow.close();
    }
  }

  /**
   * Generate HTML content for printable personal prayers list
   */
  private generatePersonalPrayersPrintableHTML(prayers: any[], timeRange: TimeRange = 'month'): string {
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
      ? `All Personal Prayers (as of ${today})`
      : `${startDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })} - ${today}`;

    // Group prayers by status
    const prayersByStatus = {
      current: prayers.filter((p: any) => p.status === 'current'),
      answered: prayers.filter((p: any) => p.status === 'answered')
    };

    // Sort prayers within each status by most recent activity
    const sortByRecentActivity = (a: any, b: any) => {
      const aLatestUpdate = a.updates && a.updates.length > 0
        ? Math.max(...a.updates.map((u: any) => new Date(u.created_at).getTime()))
        : 0;
      const bLatestUpdate = b.updates && b.updates.length > 0
        ? Math.max(...b.updates.map((u: any) => new Date(u.created_at).getTime()))
        : 0;

      const aLatestActivity = Math.max(new Date(a.created_at).getTime(), aLatestUpdate);
      const bLatestActivity = Math.max(new Date(b.created_at).getTime(), bLatestUpdate);

      return bLatestActivity - aLatestActivity;
    };

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

    // Generate sections for each status
    (['current', 'answered'] as const).forEach(status => {
      const statusPrayers = prayersByStatus[status];
      if (statusPrayers.length > 0) {
        const prayersHTML = statusPrayers.map((prayer: any) => this.generatePersonalPrayerHTML(prayer)).join('');
        
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
  <title>Personal Prayers - ${today}</title>
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
    }

    @media print {
      body {
        padding: 0;
      }
      .columns {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .prayer-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>🙏 Personal Prayers</h1>
      <span class="date-range">${dateRange}</span>
    </div>
    <div class="header-right">
      Generated: ${today} at ${currentTime}
    </div>
  </div>

  ${prayerSectionsHTML}

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for a single personal prayer
   */
  private generatePersonalPrayerHTML(prayer: any): string {
    const createdDate = new Date(prayer.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Sort updates by date (newest first)
    const sortedUpdates = Array.isArray(prayer.updates) 
      ? [...prayer.updates].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      : [];
    
    // Get updates from the last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentUpdates = sortedUpdates.filter(update => 
      new Date(update.created_at).getTime() > oneWeekAgo.getTime()
    );
    
    // If there are updates less than 1 week old, show all of them
    // Otherwise, show only the most recent update
    const updates = recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
    
    // Show updates in condensed format with minimal spacing
    const updatesHTML = updates.length > 0 ? `
      <div class="updates-section">
        <div class="updates-header">Updates (${updates.length}):</div>
        ${updates.map(update => {
          const updateDate = new Date(update.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          return `<div class="update-item"><span class="update-meta">Updated by: ${this.escapeHtml(update.author || 'Anonymous')} • ${updateDate}:</span> ${this.escapeHtml(update.content)}</div>`;
        }).join('')}
      </div>
    ` : '';

    return `
      <div class="prayer-item ${prayer.status}">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div class="prayer-for"><strong>Prayer For:</strong> ${this.escapeHtml(prayer.title)}</div>
        </div>
        <div class="prayer-meta">
          <span>${prayer.prayer_for ? this.escapeHtml(prayer.prayer_for) : 'Personal Prayer'} • ${createdDate}</span>
        </div>
        ${prayer.description ? `<div class="prayer-description">${this.escapeHtml(prayer.description)}</div>` : ''}
        ${updatesHTML}
      </div>
    `;
  }

  /**
   * Generate HTML for a single prompt
   */
  private generatePromptsPrintableHTML(prompts: any[]): string {
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

    // Group prompts by type
    const promptsByType: { [key: string]: any[] } = {};
    
    prompts.forEach(prompt => {
      if (!promptsByType[prompt.type]) {
        promptsByType[prompt.type] = [];
      }
      promptsByType[prompt.type].push(prompt);
    });

    // Get types in the order they appear in the already-sorted prompts array
    const sortedTypes: string[] = [];
    prompts.forEach(prompt => {
      if (!sortedTypes.includes(prompt.type)) {
        sortedTypes.push(prompt.type);
      }
    });

    // Type colors for visual distinction
    const typeColors: { [key: string]: string } = {
      'Praise': '#39704D',
      'Confession': '#C9A961',
      'Thanksgiving': '#0047AB',
      'Supplication': '#8b5cf6'
    };

    let promptSectionsHTML = '';

    sortedTypes.forEach(type => {
      const typePrompts = promptsByType[type];
      const color = typeColors[type] || '#6b7280';
      
      // Split into two columns (column-major ordering)
      const mid = Math.ceil(typePrompts.length / 2);
      const col1 = typePrompts.slice(0, mid);
      const col2 = typePrompts.slice(mid);

      const col1HTML = col1.map((prompt) => this.generatePromptHTML(prompt)).join('');
      const col2HTML = col2.map((prompt) => this.generatePromptHTML(prompt)).join('');

      promptSectionsHTML += `
        <div class="type-section">
          <h2 style="color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 2px; margin-bottom: 2px; margin-top: 4px; font-size: 14px;">
            ${this.escapeHtml(type)} (${typePrompts.length})
          </h2>
          <div class="columns">
            <div class="col">${col1HTML}</div>
            <div class="col">${col2HTML}</div>
          </div>
        </div>
      `;
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prayer Prompts - ${today}</title>
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
      margin-bottom: 4px;
      padding-bottom: 3px;
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
      gap: 12px;
      flex-wrap: wrap;
    }

    .header-right {
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
    }

    .header h1 {
      font-size: 16px;
      color: #1f2937;
      margin: 0;
    }

    .type-section {
      margin-bottom: 3px;
    }

    .prompt-item {
      background: transparent;
      border: 1px solid #e6e6e6;
      padding: 3px 6px;
      margin-bottom: 3px;
      border-radius: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .prompt-text {
      font-size: 13px;
      color: #374151;
      line-height: 1.3;
      display: inline;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .columns {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .col {
      flex: 1 1 0;
      min-width: 0;
    }

    @media screen and (max-width: 768px) {
      body {
        padding: 15px;
        font-size: 16px;
      }

      .header h1 {
        font-size: 24px;
      }

      .prompt-text {
        font-size: 16px;
      }
    }

    @media print {
      body {
        padding: 15px;
      }

      .no-print {
        display: none !important;
      }

      .prompt-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      h2 {
        page-break-after: avoid;
        break-after: avoid;
      }
    }

    @page {
      margin: 0.5in;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>🙏 Prayer Prompts</h1>
    </div>
    <div class="header-right">
      Generated: ${today} at ${currentTime}
    </div>
  </div>
  ${promptSectionsHTML}

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for a single prompt
   */
  private generatePromptHTML(prompt: any): string {
    return `
      <div class="prompt-item">
        <span class="prompt-text">${this.escapeHtml(prompt.title)}</span>
      </div>
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
