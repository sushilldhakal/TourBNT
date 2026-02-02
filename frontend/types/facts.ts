/**
 * Facts types for dashboard tour facts management.
 * Canonical shape for API and tour editor.
 */

export interface FactData {
    _id?: string;
    factId?: string;
    name: string;
    id?: string;
    field_type: 'Plain Text' | 'Single Select' | 'Multi Select';
    label?: string;
    icon?: string;
    value: string | string[] | Array<{ label: string; value: string; disable?: boolean }>;
    userId?: string;
}

export interface UseFactItemProps {
    fact?: FactData;
    DeleteFact?: (id: string) => void;
}

/** Form data for Add Facts (dashboard) */
export interface FactFormData {
    name: string;
    field_type: string;
    value: string[];
    icon: string;
    userId: string | null;
}
