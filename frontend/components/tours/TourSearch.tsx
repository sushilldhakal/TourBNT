"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { format } from "date-fns";
import { CalendarIcon, Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

const TourSearch = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [keyword, setKeyword] = useState("");
    const [destination, setDestination] = useState("");
    const [tourType, setTourType] = useState("");
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

        const params = new URLSearchParams();

        if (keyword) params.append("keyword", keyword);
        if (destination) params.append("destination", destination);
        if (tourType) params.append("type", tourType);
        if (date?.from) params.append("startDate", date.from.toISOString());
        if (date?.to) params.append("endDate", date.to.toISOString());
        params.append("minPrice", priceRange[0].toString());
        params.append("maxPrice", priceRange[1].toString());

        router.push(`/tours?${params.toString()}`);

        toast({
            title: "Searching tours",
            description: "Finding the best tours for you...",
            duration: 2000,
        });
    };

    return (
        <div className="search-form w-full">
            <form onSubmit={handleSearch} className="space-y-4">
                {/* Search Keyword */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-2">Search Keyword</label>
                    <input
                        type="text"
                        placeholder="Search by keyword"
                        className="w-full h-10 bg-background border border-input px-4 py-2 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>

                {/* Choose Destination */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-2">Choose Destinations</label>
                    <Select value={destination} onValueChange={setDestination}>
                        <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="nepal">Nepal</SelectItem>
                            <SelectItem value="india">India</SelectItem>
                            <SelectItem value="bhutan">Bhutan</SelectItem>
                            <SelectItem value="tibet">Tibet</SelectItem>
                            <SelectItem value="peru">Peru</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Choose Trip Type */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-2">Choose Trip Type</label>
                    <Select value={tourType} onValueChange={setTourType}>
                        <SelectTrigger className="w-full h-10">
                            <SelectValue placeholder="Select trip type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="adventure">Adventure</SelectItem>
                            <SelectItem value="cultural">Cultural</SelectItem>
                            <SelectItem value="historical">Historical</SelectItem>
                            <SelectItem value="nature">Nature</SelectItem>
                            <SelectItem value="wildlife">Wildlife</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Trip Start/End Range */}
                <div className="form-group">
                    <label className="block text-sm font-medium mb-2">Trip Start End Range</label>
                    <div className="grid gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-10",
                                        !date && "text-muted-foreground"
                                    )}
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
                            <PopoverContent className="w-auto p-0" align="start">
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
                    <label className="block text-sm font-medium mb-2">Price Range</label>
                    <div className="px-2">
                        <DualRangeSlider
                            min={0}
                            max={10000}
                            step={10}
                            defaultValue={[0, 100]}
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
                    className="w-full font-medium py-2 px-4 rounded-md"
                >
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Search
                </Button>
            </form>
        </div>
    );
};

export default TourSearch;
