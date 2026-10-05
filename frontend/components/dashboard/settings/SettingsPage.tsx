/**
 * SettingsPage Component
 *
 * Main settings page for managing API integrations.
 * Handles the OpenAI API key.
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@/lib/forms/zodResolver';
import { useMutation } from '@tanstack/react-query';
import { useCacheManager, useUserSettings } from '@/lib/queries';
import { updateMySettings, getMyDecryptedApiKey } from '@/lib/api/users';
import { getUserId } from '@/lib/utils/auth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import {
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    BrainCircuit,
    CheckCircle2,
    AlertCircle,
    Info as InfoIcon,
    ExternalLink,
    Save,
    Lock,
    Settings2,
} from 'lucide-react';
import { DashboardCardHeader } from '../layout/CardHeader';



const formSchema = z.object({
    OPENAI_API_KEY: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SettingsPage() {
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});
    const [isLoadingKeys, setIsLoadingKeys] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState('openai');
    const [initialValues, setInitialValues] = useState<FormValues>({
        OPENAI_API_KEY: '',
    });

    const { toast } = useToast();
    const userId = getUserId();

    const { data, isLoading, isError } = useUserSettings(userId ?? undefined, !!userId);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            OPENAI_API_KEY: '',
        },
    });

    // Keys are never sent back in the clear: once settings load, the form starts blank.
    useEffect(() => {
        if (data) form.reset({ OPENAI_API_KEY: '' });
    }, [data, form]);

    const { invalidateUserSettings } = useCacheManager();
    const userSettingUpdate = useMutation({
        mutationFn: ({ formData }: { userId: string; formData: FormData }) =>
            updateMySettings(formData),
        onSuccess: () => {
            setDecryptedKeys({});
            setVisibleKeys({});
            invalidateUserSettings();

            toast({
                title: 'Success!',
                description: 'Your API keys have been updated.',
            });
            setIsSubmitting(false);
        },
        onError: (error) => {
            console.error('Error updating settings:', error);
            toast({
                title: 'Error!',
                description: 'Failed to update settings. Please try again.',
                variant: 'destructive',
            });
            setIsSubmitting(false);
        },
    });

    function onSubmit(values: FormValues) {
        setIsSubmitting(true);
        const formData = new FormData();
        let hasChanges = false;

        // Only include API keys if they've been modified and are not empty
        if (
            values.OPENAI_API_KEY &&
            values.OPENAI_API_KEY.trim() !== '' &&
            values.OPENAI_API_KEY !== initialValues.OPENAI_API_KEY
        ) {
            formData.append('OPENAI_API_KEY', values.OPENAI_API_KEY);
            hasChanges = true;
        }

        if (hasChanges && userId) {
            userSettingUpdate.mutate({ userId, formData });
        } else {
            setIsSubmitting(false);
            if (!hasChanges) {
                toast({
                    title: 'No Changes',
                    description: 'No changes were detected. Please modify at least one field.',
                });
            }
        }
    }

    // Function to fetch and show decrypted API key
    const fetchDecryptedKey = async (keyType: string) => {
        if (!userId) return;

        try {
            setIsLoadingKeys((prev) => ({ ...prev, [keyType]: true }));

            const keyTypeMap: Record<string, string> = {
                OPENAI_API_KEY: 'openai_api_key',
            };

            const response = await getMyDecryptedApiKey(keyTypeMap[keyType]) as { key?: string };

            if (response && response.key !== undefined) {
                if (response.key === '') {
                    toast({
                        title: 'No API Key Found',
                        description: `There is no ${keyType.toLowerCase().replace('_', ' ')} stored or it could not be decrypted.`,
                    });
                } else {
                    setDecryptedKeys((prev) => ({ ...prev, [keyType]: response.key || '' }));

                    form.setValue(keyType as keyof FormValues, response.key, {
                        shouldDirty: false,
                        shouldTouch: false,
                    });

                    setInitialValues((prev) => ({
                        ...prev,
                        [keyType]: response.key,
                    }));

                    toast({
                        title: 'API Key Retrieved',
                        description: `Your ${keyType.toLowerCase().replace('_', ' ')} has been retrieved and is now visible.`,
                    });
                }
            }
        } catch (error) {
            console.error(`Error fetching decrypted ${keyType}:`, error);
            toast({
                title: 'Error',
                description: `Could not retrieve the decrypted ${keyType}. Please try again.`,
                variant: 'destructive',
            });
        } finally {
            setIsLoadingKeys((prev) => ({ ...prev, [keyType]: false }));
        }
    };

    const toggleVisibility = async (key: string) => {
        if (!visibleKeys[key] && isKeySet(key) && !decryptedKeys[key]) {
            await fetchDecryptedKey(key);
        }
        setVisibleKeys((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const isKeySet = (key: string): boolean => {
        if (!data) return false;

        type KeyFlags = { openaiApiKey?: unknown };
        const settingsData = ((data as { settings?: KeyFlags }).settings || data) as KeyFlags;

        return key === 'OPENAI_API_KEY' && !!settingsData.openaiApiKey;
    };

    const getPlaceholder = (key: string): string => {
        return isKeySet(key) ? '••••••••••••••••' : 'Enter your API key...';
    };

    const renderApiKeyField = (name: keyof FormValues, label: string) => {
        const isSet = isKeySet(name);
        const isVisible = visibleKeys[name];
        const isLoading = isLoadingKeys[name];

        return (
            <FormField
                control={form.control}
                name={name}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-2">
                            {label}
                            {isSet && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <KeyRound className="h-4 w-4 text-primary" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>API key is set and securely stored</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input
                                    type={isVisible ? 'text' : 'password'}
                                    className="w-full pr-10"
                                    placeholder={getPlaceholder(name)}
                                    {...field}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => toggleVisibility(name)}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isVisible ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </FormControl>
                        {isSet && (
                            <p className="text-xs text-muted-foreground">
                                Leave blank to keep the existing API key
                            </p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    };

    const renderOpenAIContent = () => (
        <Card className="pt-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>OpenAI Integration</CardTitle>
                        <CardDescription>
                            Configure OpenAI for AI-powered features and text completion
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <div className="flex gap-3">
                        <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-primary-foreground dark:text-primary">
                                Visit the{' '}
                                <Link
                                    className="text-primary font-medium inline-flex items-center hover:underline"
                                    target="_blank"
                                    href="https://platform.openai.com/docs/overview"
                                >
                                    OpenAI Platform <ExternalLink className="h-3 w-3 ml-0.5" />
                                </Link>{' '}
                                to create a free account. Then create a new API key from the{' '}
                                <Link
                                    className="text-primary font-medium inline-flex items-center hover:underline"
                                    target="_blank"
                                    href="https://platform.openai.com/api-keys"
                                >
                                    OpenAI Dashboard <ExternalLink className="h-3 w-3 ml-0.5" />
                                </Link>
                            </p>
                            <p className="text-sm text-primary-foreground dark:text-primary mt-2">
                                This enables AI auto-complete and other AI-powered features throughout your
                                application.
                            </p>
                        </div>
                    </div>
                </div>

                {renderApiKeyField('OPENAI_API_KEY', 'OpenAI API Key')}

                <Separator className="my-4" />

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Features enabled with OpenAI</h3>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>AI-powered text completion</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Smart content suggestions</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Automated content generation</span>
                        </li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <DashboardCardHeader
                variant="compact"
                icon={Settings2}
                badge="Settings"
                title="API Integrations"
                description="Configure your API keys..."
            />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Tabs defaultValue="openai" value={activeTab} onValueChange={setActiveTab}>
                        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
                            {/* Sidebar */}
                            <div className="space-y-6">
                                <Card>
                                    <CardContent className="p-4">
                                        <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
                                            <TabsTrigger
                                                value="openai"
                                                className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                            >
                                                <BrainCircuit className="h-4 w-4" />
                                                <span>OpenAI</span>
                                                {isKeySet('OPENAI_API_KEY') && (
                                                    <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />
                                                )}
                                            </TabsTrigger>
                                        </TabsList>
                                    </CardContent>
                                    <CardFooter className="px-4 py-4 border-t">
                                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </Card>

                                <Card className="pt-0">
                                    <CardHeader className="pb-3 pt-4 rounded-t-xl">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Lock className="h-4 w-4 text-muted-foreground" />
                                            Security Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        <p className="mb-2">
                                            All API keys are encrypted before being stored in our database.
                                        </p>
                                        <p>
                                            We use industry-standard encryption to protect your sensitive credentials.
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Main Content */}
                            <div className="space-y-6">
                                {isLoading ? (
                                    <Card>
                                        <CardContent className="p-8 flex justify-center items-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"
                                            />
                                        </CardContent>
                                    </Card>
                                ) : isError ? (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>
                                            There was a problem loading your settings. Please refresh the page or add
                                            new values.
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <>
                                        <TabsContent value="openai" className="mt-0 space-y-6">
                                            {renderOpenAIContent()}
                                        </TabsContent>
                                    </>
                                )}
                            </div>
                        </div>
                    </Tabs>
                </form>
            </Form>
        </div>
    );
}
