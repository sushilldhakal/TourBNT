"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar-lazy";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { format } from "date-fns";
import { CalendarIcon, Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "@/components/ui/calendar-lazy";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useApprovedCategories, useApprovedDestinations } from "@/lib/queries";
import { buildTourSearchUrl } from "@/lib/tourSearchUrl";

const ALL = "__all__";

/**
 * Every field in the search panel: a solid field in the theme's own colours, so text and placeholders contrast in
 * light and dark mode alike. (The panel sits on a photo; the old see-through fields with hard-coded white or
 * "on-primary" text became light-on-light in light mode and dark-on-dark in dark mode.) The dark: overrides beat
 * the shadcn components' own translucent dark-mode backgrounds.
 */
const FIELD =
    'w-full h-10 rounded-md border border-border bg-background/95 dark:bg-background/95 text-foreground placeholder:text-muted-foreground data-[placeholder]:text-muted-foreground shadow-sm';

const Search = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [keyword, setKeyword] = useState("");
    // Real destinations and trip types (by id), the same lists the tours page filters on.
    const { data: categoriesData } = useApprovedCategories();
    const { data: destinationsData } = useApprovedDestinations();
    const categories = (Array.isArray(categoriesData) ? categoriesData : (categoriesData as { data?: unknown[] })?.data ?? []) as Array<{ id?: string; _id?: string; name?: string }>;
    const destinations = (Array.isArray(destinationsData) ? destinationsData : (destinationsData as { data?: unknown[] })?.data ?? []) as Array<{ id?: string; _id?: string; name?: string }>;
    const [destination, setDestination] = useState(ALL);
    const [tourType, setTourType] = useState(ALL);
    const [date, setDate] = useState<DateRange | undefined>({
        from: undefined,
        to: undefined,
    });
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

    const handleValueChange = (newValues: number[]) => {
        setPriceRange(newValues as [number, number]);
    };

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();

        // /tours is the results page (there is no /tours/search page; that path was read as a tour id and 404ed).
        router.push(buildTourSearchUrl({
            keyword,
            destinationId: destination !== ALL ? destination : undefined,
            categoryId: tourType !== ALL ? tourType : undefined,
            from: date?.from,
            to: date?.to,
            priceRange,
        }));

        toast({
            title: "Searching tours",
            description: "Finding the best tours for you...",
            duration: 2000,
        });
    };

    return (
        <div className="search-form w-full text-foreground">
            <form onSubmit={handleSearch} className="space-y-4">
                {/* Search Keyword */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-1">Search Keyword</label>
                    <input
                        type="text"
                        placeholder="Search by keyword"
                        className={`${FIELD} px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring`}
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                {/* Choose Destination */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-1">Choose Destinations</label>
                    <Select value={destination} onValueChange={setDestination}>
                        <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="All destinations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All destinations</SelectItem>
                            {destinations.map((d, i) => {
                                const id = d.id ?? d._id ?? `dest-${i}`;
                                return <SelectItem key={id} value={id}>{d.name ?? 'Destination'}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Choose Trip Type */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-1">Choose Trip Type</label>
                    <Select value={tourType} onValueChange={setTourType}>
                        <SelectTrigger className={FIELD}>
                            <SelectValue placeholder="All trip types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All trip types</SelectItem>
                            {categories.map((c, i) => {
                                const id = c.id ?? c._id ?? `cat-${i}`;
                                return <SelectItem key={id} value={id}>{c.name ?? 'Trip type'}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Trip Start/End Range */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-1">Trip Start End Range</label>
                    <div className="grid gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(FIELD, "justify-start text-left font-normal hover:bg-background hover:text-foreground dark:hover:bg-background", !date && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Select a date range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-max !animate-none p-0" style={{ width: "max-content", padding: 0, animation: "none" }} align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Price Range */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-1">Price Range</label>
                    <div className="px-2">
                        <DualRangeSlider
                            min={0}
                            max={10000}
                            step={100}
                            defaultValue={[0, 10000]}
                            value={priceRange}
                            onValueChange={handleValueChange}
                            label={(value: number) => `${value}`}
                            showEditableInputs={true}
                            currency="$"
                            className="py-4"
                        />
                    </div>
                </div>

                {/* Search Button */}
                <Button
                    type="submit"
                    className="w-full font-medium py-2 px-4 rounded"
                >
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search
                </Button>
            </form>
        </div>
    );
};

export default Search;
