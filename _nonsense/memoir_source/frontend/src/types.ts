export interface TimelineEvent {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
}

export interface Thread {
    id: string;
    title: string;
    last_activity: number | string;
    message_count: number;
    status: string;
    is_important: boolean;
}

export interface Message {
    id: string;
    sender_name: string;
    content_text: string;
    timestamp_utc: number;
}

export interface DashboardSummary {
    system: {
        ingestStatus: string;
        indexStatus: string;
        lastIngestAt: string | null;
    };
    kpis: {
        conversations: number;
        messages: number;
        people: number;
        media: number;
        drafts: number;
    };
    nextAction: {
        title: string;
        description: string;
        primaryCta: { label: string; href: string };
        secondaryCtas: { label: string; href: string }[];
    };
    drafts: {
        id: string;
        title: string;
        updated_at: string;
        status: string;
    }[];
    suggestedMoments: {
        id: string;
        title: string;
        confidence: string;
        tags: string[];
    }[];
    activity: {
        event_type: string;
        description: string;
        timestamp: string;
    }[];
}
