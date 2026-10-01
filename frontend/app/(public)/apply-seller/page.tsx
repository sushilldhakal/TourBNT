'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, Check, CheckCircle2, FileText, Landmark, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCacheManager } from '@/lib/queries';
import { updateMyProfile } from '@/lib/api/users';
import { cn } from '@/lib/utils';

const SELLER_TYPES = [
    { value: 'tour_operator', label: 'Tour operator' },
    { value: 'travel_agency', label: 'Travel agency' },
    { value: 'trekking_agency', label: 'Trekking agency' },
    { value: 'independent_guide', label: 'Independent guide' },
    { value: 'other', label: 'Other' },
];

const COMPANY_TYPES = [
    { value: 'sole_proprietorship', label: 'Sole proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'private_limited', label: 'Private limited company' },
    { value: 'public_limited', label: 'Public limited company' },
    { value: 'other', label: 'Other' },
];

type DocKey = 'businessRegistration' | 'taxRegistration' | 'idVerification' | 'businessLicense' | 'bankStatement' | 'businessInsurance';

const DOCUMENTS: Array<{ key: DocKey; label: string; hint: string; required: boolean }> = [
    { key: 'businessRegistration', label: 'Business registration certificate', hint: 'Company / firm registration', required: true },
    { key: 'taxRegistration', label: 'Tax registration (PAN / VAT)', hint: 'Tax registration certificate', required: true },
    { key: 'idVerification', label: 'Owner ID', hint: 'Citizenship or passport of the owner', required: true },
    { key: 'businessLicense', label: 'Tourism / operating licence', hint: 'Licence to operate tours', required: false },
    { key: 'bankStatement', label: 'Bank statement or cancelled cheque', hint: 'Proves the payout account', required: false },
    { key: 'businessInsurance', label: 'Business insurance', hint: 'Liability cover, if you have it', required: false },
];

const STEPS = [
    { title: 'Company', icon: Building2 },
    { title: 'Contact & bank', icon: Landmark },
    { title: 'Documents', icon: FileText },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

type FormState = Record<string, string>;

const EMPTY: FormState = {
    companyName: '', companyRegistrationNumber: '', companyType: '', registrationDate: '', taxId: '', website: '', sellerType: '', businessDescription: '',
    contactPerson: '', phone: '', alternatePhone: '', address: '', city: '', state: '', postalCode: '', country: 'Nepal',
    bankName: '', accountNumber: '', accountHolderName: '', branchCode: '',
};

const REQUIRED_BY_STEP: Array<Array<[string, string]>> = [
    [['companyName', 'Company name'], ['companyRegistrationNumber', 'Registration number'], ['companyType', 'Company type'], ['registrationDate', 'Registration date'], ['taxId', 'Tax ID'], ['sellerType', 'Seller type'], ['businessDescription', 'Business description']],
    [['contactPerson', 'Contact person'], ['phone', 'Phone'], ['address', 'Address'], ['city', 'City'], ['country', 'Country'], ['bankName', 'Bank name'], ['accountNumber', 'Account number'], ['accountHolderName', 'Account holder name']],
    [],
];

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
    return (
        <div className="space-y-2">
            <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function DocPicker({ doc, files, onChange }: { doc: (typeof DOCUMENTS)[number]; files: File[]; onChange: (files: File[]) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);

    const add = (picked: FileList | null) => {
        if (!picked) return;
        const next = [...files];
        for (const file of Array.from(picked)) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                toast({ title: 'Unsupported file', description: `${file.name}: only JPG, PNG or PDF files are allowed.`, variant: 'destructive' });
                continue;
            }
            if (file.size > MAX_FILE_BYTES) {
                toast({ title: 'File too large', description: `${file.name} is over 10 MB.`, variant: 'destructive' });
                continue;
            }
            if (next.length < 5) next.push(file);
        }
        onChange(next);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium">{doc.label}{doc.required && <span className="text-destructive"> *</span>}</p>
                    <p className="text-xs text-muted-foreground">{doc.hint}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />Upload
                </Button>
                <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="hidden" onChange={(e) => add(e.target.files)} />
            </div>
            {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                    {files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                            <span className="truncate">{f.name} <span className="text-xs text-muted-foreground">({(f.size / 1024 / 1024).toFixed(1)} MB)</span></span>
                            <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="ml-2 text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function ApplySellerPage() {
    const { user, isHydrated } = useAuth();
    const { invalidateCurrentUser } = useCacheManager();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<FormState>(EMPTY);
    const [docs, setDocs] = useState<Partial<Record<DocKey, File[]>>>({});
    const [agree, setAgree] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const set = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [name]: e.target.value }));
    const setValue = (name: string) => (value: string) => setForm((f) => ({ ...f, [name]: value }));

    // Prefill from the account once it has loaded.
    useEffect(() => {
        if (!user?.id) return;
        setForm((f) => ({ ...f, contactPerson: f.contactPerson || user.name || '', phone: f.phone || (user as { phone?: string }).phone || '' }));
    }, [user?.id, user]);

    const missing = useMemo(() => REQUIRED_BY_STEP[step].filter(([k]) => !form[k]?.trim()).map(([, label]) => label), [step, form]);
    const missingDocs = DOCUMENTS.filter((d) => d.required && !(docs[d.key]?.length));

    const next = () => {
        if (missing.length) {
            toast({ title: 'Please complete this step', description: `Missing: ${missing.join(', ')}`, variant: 'destructive' });
            return;
        }
        setStep((s) => s + 1);
    };

    const submit = async () => {
        if (missingDocs.length) {
            toast({ title: 'Documents required', description: `Please upload: ${missingDocs.map((d) => d.label).join(', ')}`, variant: 'destructive' });
            return;
        }
        if (!agree) {
            toast({ title: 'Please accept the terms', variant: 'destructive' });
            return;
        }
        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => data.append(k, v.trim()));
        (Object.entries(docs) as Array<[DocKey, File[]]>).forEach(([key, files]) => files.forEach((f) => data.append(key, f)));

        setSubmitting(true);
        try {
            await updateMyProfile(data);
            await invalidateCurrentUser();
            setSubmitted(true);
        } catch (err) {
            toast({ title: 'Could not submit application', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const shell = (children: React.ReactNode) => (
        <div className="mx-auto w-full max-w-3xl px-4 py-12">
            <div className="mb-8 text-center">
                <h1 className="mb-2 text-4xl font-bold">Become a Seller</h1>
                <p className="text-lg text-muted-foreground">Tell us about your business and we will review your application.</p>
            </div>
            {children}
        </div>
    );

    if (!isHydrated) return shell(<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>);

    if (!user?.id) {
        return shell(
            <Card><CardContent className="space-y-4 py-10 text-center">
                <p>You need an account to apply as a seller.</p>
                <div className="flex justify-center gap-3">
                    <Button asChild><Link href="/auth/login">Log in</Link></Button>
                    <Button asChild variant="outline"><Link href="/auth/register">Create account</Link></Button>
                </div>
            </CardContent></Card>
        );
    }

    if (submitted) {
        return shell(
            <Card><CardContent className="space-y-4 py-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
                <h2 className="text-2xl font-semibold">Application submitted</h2>
                <p className="text-muted-foreground">Our team will review your documents. You will be notified once it is approved.</p>
                <Button asChild><Link href="/dashboard/profile">View my application</Link></Button>
            </CardContent></Card>
        );
    }

    return shell(
        <>
            <ol className="mb-8 flex items-center justify-between gap-2">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const done = i < step;
                    return (
                        <li key={s.title} className="flex flex-1 items-center gap-2">
                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold', done && 'border-primary bg-primary text-primary-foreground', i === step && 'border-primary text-primary')}>
                                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                            </span>
                            <span className={cn('hidden text-sm sm:inline', i === step ? 'font-semibold' : 'text-muted-foreground')}>{i + 1}. {s.title}</span>
                            {i < STEPS.length - 1 && <span className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')} />}
                        </li>
                    );
                })}
            </ol>

            {step === 0 && (
                <Card>
                    <CardHeader><CardTitle>Company information</CardTitle><CardDescription>As shown on your registration documents.</CardDescription></CardHeader>
                    <CardContent className="grid gap-5 md:grid-cols-2">
                        <Field label="Company name" required><Input value={form.companyName} onChange={set('companyName')} /></Field>
                        <Field label="Registration number" required><Input value={form.companyRegistrationNumber} onChange={set('companyRegistrationNumber')} /></Field>
                        <Field label="Company type" required>
                            <Select value={form.companyType} onValueChange={setValue('companyType')}>
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>{COMPANY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </Field>
                        <Field label="Registration date" required><Input type="date" value={form.registrationDate} onChange={set('registrationDate')} /></Field>
                        <Field label="Tax ID (PAN / VAT)" required><Input value={form.taxId} onChange={set('taxId')} /></Field>
                        <Field label="Seller type" required>
                            <Select value={form.sellerType} onValueChange={setValue('sellerType')}>
                                <SelectTrigger><SelectValue placeholder="What do you do?" /></SelectTrigger>
                                <SelectContent>{SELLER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </Field>
                        <div className="md:col-span-2"><Field label="Website"><Input type="url" placeholder="https://" value={form.website} onChange={set('website')} /></Field></div>
                        <div className="md:col-span-2"><Field label="Business description" required><Textarea rows={4} value={form.businessDescription} onChange={set('businessDescription')} placeholder="What tours do you run, where, and for whom?" /></Field></div>
                    </CardContent>
                </Card>
            )}

            {step === 1 && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Contact & address</CardTitle></CardHeader>
                        <CardContent className="grid gap-5 md:grid-cols-2">
                            <Field label="Contact person" required><Input value={form.contactPerson} onChange={set('contactPerson')} /></Field>
                            <Field label="Phone" required><Input type="tel" value={form.phone} onChange={set('phone')} /></Field>
                            <Field label="Alternate phone"><Input type="tel" value={form.alternatePhone} onChange={set('alternatePhone')} /></Field>
                            <Field label="Street address" required><Input value={form.address} onChange={set('address')} /></Field>
                            <Field label="City" required><Input value={form.city} onChange={set('city')} /></Field>
                            <Field label="State / province"><Input value={form.state} onChange={set('state')} /></Field>
                            <Field label="Postal code"><Input value={form.postalCode} onChange={set('postalCode')} /></Field>
                            <Field label="Country" required><Input value={form.country} onChange={set('country')} /></Field>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Bank details</CardTitle><CardDescription>Where we send your payouts.</CardDescription></CardHeader>
                        <CardContent className="grid gap-5 md:grid-cols-2">
                            <Field label="Bank name" required><Input value={form.bankName} onChange={set('bankName')} /></Field>
                            <Field label="Account number" required><Input value={form.accountNumber} onChange={set('accountNumber')} /></Field>
                            <Field label="Account holder name" required><Input value={form.accountHolderName} onChange={set('accountHolderName')} /></Field>
                            <Field label="Branch code"><Input value={form.branchCode} onChange={set('branchCode')} /></Field>
                        </CardContent>
                    </Card>
                </div>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader><CardTitle>Documents</CardTitle><CardDescription>JPG, PNG or PDF, up to 10 MB each. Only our review team can see these.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        {DOCUMENTS.map((d) => (
                            <DocPicker key={d.key} doc={d} files={docs[d.key] ?? []} onChange={(files) => setDocs((prev) => ({ ...prev, [d.key]: files }))} />
                        ))}
                        <label className="flex items-start gap-3 pt-2 text-sm">
                            <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
                            <span>I confirm the information and documents are accurate and I agree to the seller terms.</span>
                        </label>
                    </CardContent>
                </Card>
            )}

            <div className="mt-6 flex justify-between">
                <Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => setStep((s) => s - 1)}>Back</Button>
                {step < STEPS.length - 1 ? (
                    <Button type="button" onClick={next}>Continue</Button>
                ) : (
                    <Button type="button" onClick={submit} disabled={submitting}>
                        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit application'}
                    </Button>
                )}
            </div>
        </>
    );
}
