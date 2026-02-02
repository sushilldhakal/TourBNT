/**
 * FAQ types for dashboard tour FAQ management.
 * Canonical shape for API and tour editor.
 */

export interface FaqData {
    _id?: string;
    id?: string;
    question: string;
    answer: string;
    userId?: string;
    faqId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UseFaqItemProps {
    faq?: FaqData;
    DeleteFaq?: (id: string) => void;
}
