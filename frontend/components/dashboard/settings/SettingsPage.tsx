/**
 * SettingsPage Component
 * 
 * Main settings page for managing API integrations.
 * Handles Cloudinary, OpenAI, and Google Maps API keys.
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserSetting, userSetting, getDecryptedApiKey } from '@/lib/api/users';
import { getUserId } from '@/lib/utils/auth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import {
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Cloud as CloudIcon,
    BrainCircuit,
    MapPin,
    CheckCircle2,
    AlertCircle,
    Info as InfoIcon,
    ExternalLink,
    Save,
    Lock,
    Settings2,
} from 'lucide-react';



const formSchema = z.object({
    CLOUDINARY_CLOUD: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SettingsPage() {
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({});
    const [isLoadingKeys, setIsLoadingKeys] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState('cloudinary');
    const [initialValues, setInitialValues] = useState<FormValues>({
        CLOUDINARY_CLOUD: '',
        CLOUDINARY_API_KEY: '',
        CLOUDINARY_API_SECRET: '',
        OPENAI_API_KEY: '',
        GOOGLE_API_KEY: '',
    });

    const { toast } = useToast();
    const userId = getUserId();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['userSettings'],
        queryFn: () => getUserSetting(userId || '') as Promise<any>,
        enabled: !!userId,
    });

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            CLOUDINARY_CLOUD: '',
            CLOUDINARY_API_KEY: '',
            CLOUDINARY_API_SECRET: '',
            OPENAI_API_KEY: '',
            GOOGLE_API_KEY: '',
        },
    });

    // Populate form with fetched data
    useEffect(() => {
        if (data) {
            const settingsData = data.settings || data;

            const initialFormValues: FormValues = {
                CLOUDINARY_CLOUD: settingsData.cloudinaryCloud || '',
                CLOUDINARY_API_KEY: '',
                CLOUDINARY_API_SECRET: '',
                OPENAI_API_KEY: '',
                GOOGLE_API_KEY: '',
            };

            setInitialValues(initialFormValues);
            form.reset(initialFormValues);
        }
    }, [data, form]);

    const queryClient = useQueryClient();
    const userSettingUpdate = useMutation({
        mutationFn: ({ userId, formData }: { userId: string; formData: FormData }) =>
            userSetting(userId, formData),
        onSuccess: () => {
            setDecryptedKeys({});
            setVisibleKeys({});
            queryClient.invalidateQueries({ queryKey: ['userSettings'] });

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

        // Check if Cloudinary cloud name has changed
        if (
            values.CLOUDINARY_CLOUD &&
            values.CLOUDINARY_CLOUD.trim() !== '' &&
            values.CLOUDINARY_CLOUD !== initialValues.CLOUDINARY_CLOUD
        ) {
            formData.append('CLOUDINARY_CLOUD', values.CLOUDINARY_CLOUD);
            hasChanges = true;
        }

        // Only include API keys if they've been modified and are not empty
        if (
            values.CLOUDINARY_API_KEY &&
            values.CLOUDINARY_API_KEY.trim() !== '' &&
            values.CLOUDINARY_API_KEY !== initialValues.CLOUDINARY_API_KEY
        ) {
            formData.append('CLOUDINARY_API_KEY', values.CLOUDINARY_API_KEY);
            hasChanges = true;
        }

        if (
            values.CLOUDINARY_API_SECRET &&
            values.CLOUDINARY_API_SECRET.trim() !== '' &&
            values.CLOUDINARY_API_SECRET !== initialValues.CLOUDINARY_API_SECRET
        ) {
            formData.append('CLOUDINARY_API_SECRET', values.CLOUDINARY_API_SECRET);
            hasChanges = true;
        }

        if (
            values.OPENAI_API_KEY &&
            values.OPENAI_API_KEY.trim() !== '' &&
            values.OPENAI_API_KEY !== initialValues.OPENAI_API_KEY
        ) {
            formData.append('OPENAI_API_KEY', values.OPENAI_API_KEY);
            hasChanges = true;
        }

        if (
            values.GOOGLE_API_KEY &&
            values.GOOGLE_API_KEY.trim() !== '' &&
            values.GOOGLE_API_KEY !== initialValues.GOOGLE_API_KEY
        ) {
            formData.append('GOOGLE_API_KEY', values.GOOGLE_API_KEY);
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
                CLOUDINARY_API_KEY: 'cloudinary_api_key',
                CLOUDINARY_API_SECRET: 'cloudinary_api_secret',
                OPENAI_API_KEY: 'openai_api_key',
                GOOGLE_API_KEY: 'google_api_key',
            };

            const response = await getDecryptedApiKey(userId, keyTypeMap[keyType]) as { key?: string };

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

        const settingsData = data.settings || data;

        switch (key) {
            case 'CLOUDINARY_API_KEY':
                return !!settingsData.cloudinaryApiKey;
            case 'CLOUDINARY_API_SECRET':
                return !!settingsData.cloudinaryApiSecret;
            case 'OPENAI_API_KEY':
                return !!settingsData.openaiApiKey;
            case 'GOOGLE_API_KEY':
                return !!settingsData.googleApiKey;
            default:
                return false;
        }
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
                render={({ field }: any) => (
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

    const renderCloudinaryContent = () => (
        <Card className="pt-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <CloudIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Cloudinary Integration</CardTitle>
                        <CardDescription>
                            Configure your Cloudinary account for image and file uploads
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
                                Visit{' '}
                                <Link
                                    className="text-primary font-medium inline-flex items-center hover:underline"
                                    target="_blank"
                                    href="https://cloudinary.com/"
                                >
                                    Cloudinary <ExternalLink className="h-3 w-3 ml-0.5" />
                                </Link>{' '}
                                to create a free account. Then get your API keys from the{' '}
                                <Link
                                    className="text-primary font-medium inline-flex items-center hover:underline"
                                    target="_blank"
                                    href="https://console.cloudinary.com/settings/c-ccd6ef073e22dd5e5f1b220b3fd801/api-keys"
                                >
                                    Cloudinary Dashboard <ExternalLink className="h-3 w-3 ml-0.5" />
                                </Link>
                            </p>
                            <p className="text-sm text-primary-foreground dark:text-primary mt-2">
                                To upload PDF files, go to Settings → Security and enable the PDF and ZIP files
                                delivery option.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="CLOUDINARY_CLOUD"
                        render={({ field }: any) => (
                            <FormItem>
                                <FormLabel>Cloudinary Cloud Name</FormLabel>
                                <FormControl>
                                    <Input type="text" className="w-full" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {renderApiKeyField('CLOUDINARY_API_KEY', 'Cloudinary API Key')}
                    {renderApiKeyField('CLOUDINARY_API_SECRET', 'Cloudinary API Secret')}
                </div>
            </CardContent>
        </Card>
    );

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

    const renderGoogleMapsContent = () => (
        <Card className="pt-0">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pt-4 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-2 rounded-full">
                        <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Google Maps Integration</CardTitle>
                        <CardDescription>Configure Google Maps API for location services</CardDescription>
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
                                    href="https://developers.google.com/maps/documentation/javascript/get-api-key"
                                >
                                    Google Cloud Console <ExternalLink className="h-3 w-3 ml-0.5" />
                                </Link>{' '}
                                to create a free account. Google provides $200 in free monthly credit, which allows
                                for approximately 100,000 API calls.
                            </p>
                            <p className="text-sm text-primary-foreground dark:text-primary mt-2">
                                After creating an account, follow the steps to{' '}
                                <Link
                                    className="text-primary font-medium inline-flex items-center hover:underline"
                                    target="_blank"
                                    href="https://developers.google.com/maps/documentation/javascript/get-api-key"
                                >
                                    get an API key <ExternalLink className="h-3 w-3 ml-0.5" />
                                </Link>{' '}
                                and enable the necessary Google Maps services.
                            </p>
                        </div>
                    </div>
                </div>

                {renderApiKeyField('GOOGLE_API_KEY', 'Google Maps API Key')}

                <Separator className="my-4" />

                <div className="space-y-2">
                    <h3 className="text-sm font-medium">Features enabled with Google Maps</h3>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Location autocomplete</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Interactive maps</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span>Distance calculations</span>
                        </li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <Settings2 className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline" className="bg-card text-muted-foreground font-medium">
                        Settings
                    </Badge>
                </div>
                <h1 className="text-3xl font-bold text-foreground">API Integrations</h1>
                <p className="text-muted-foreground mt-2 max-w-3xl">
                    Configure your API keys for various services. These keys are securely encrypted and stored.
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Tabs defaultValue="cloudinary" value={activeTab} onValueChange={setActiveTab}>
                        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8">
                            {/* Sidebar */}
                            <div className="space-y-6">
                                <Card>
                                    <CardContent className="p-4">
                                        <TabsList className="flex flex-col h-auto bg-transparent space-y-1">
                                            <TabsTrigger
                                                value="cloudinary"
                                                className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                            >
                                                <CloudIcon className="h-4 w-4" />
                                                <span>Cloudinary</span>
                                                {isKeySet('CLOUDINARY_API_KEY') && (
                                                    <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />
                                                )}
                                            </TabsTrigger>
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
                                            <TabsTrigger
                                                value="google"
                                                className="w-full justify-start gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                                            >
                                                <MapPin className="h-4 w-4" />
                                                <span>Google Maps</span>
                                                {isKeySet('GOOGLE_API_KEY') && (
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
                                        <TabsContent value="cloudinary" className="mt-0 space-y-6">
                                            {renderCloudinaryContent()}
                                        </TabsContent>
                                        <TabsContent value="openai" className="mt-0 space-y-6">
                                            {renderOpenAIContent()}
                                        </TabsContent>
                                        <TabsContent value="google" className="mt-0 space-y-6">
                                            {renderGoogleMapsContent()}
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
