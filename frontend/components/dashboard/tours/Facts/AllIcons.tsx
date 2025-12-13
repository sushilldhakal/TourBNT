"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Import specific icon sets
import * as FaIcons from "react-icons/fa"
import * as AiIcons from "react-icons/ai"
import * as FiIcons from "react-icons/fi"
import * as MdIcons from "react-icons/md"
import * as IoIcons from "react-icons/io"
import * as Io5Icons from "react-icons/io5"
import * as RiIcons from "react-icons/ri"
import * as TiIcons from "react-icons/ti"
import * as GiIcons from "react-icons/gi"
import * as HiIcons from "react-icons/hi"
import * as BiIcons from "react-icons/bi"
import * as LuIcons from "react-icons/lu"

// Define icon sets with their names and import paths
const iconSets = [
    { prefix: "Fa", name: "Font Awesome", icons: FaIcons, path: "fa" },
    { prefix: "Ai", name: "Ant Design Icons", icons: AiIcons, path: "ai" },
    { prefix: "Fi", name: "Feather Icons", icons: FiIcons, path: "fi" },
    { prefix: "Md", name: "Material Design Icons", icons: MdIcons, path: "md" },
    { prefix: "Io", name: "Ionicons 4", icons: IoIcons, path: "io" },
    { prefix: "Io5", name: "Ionicons 5", icons: Io5Icons, path: "io5" },
    { prefix: "Ri", name: "Remix Icons", icons: RiIcons, path: "ri" },
    { prefix: "Ti", name: "Typicons", icons: TiIcons, path: "ti" },
    { prefix: "Gi", name: "Game Icons", icons: GiIcons, path: "gi" },
    { prefix: "Hi", name: "Heroicons", icons: HiIcons, path: "hi" },
    { prefix: "Bi", name: "BoxIcons", icons: BiIcons, path: "bi" },
    { prefix: "Lu", name: "Lucide Icons", icons: LuIcons, path: "lu" },
]

interface AllIconsProps {
    onSelectIcon: (iconName: string) => void
}

export default function AllIcons({ onSelectIcon }: AllIconsProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [viewMode, setViewMode] = useState<"all" | "bySet">("all")

    // Process icons for all sets or current set
    const getAllFilteredIcons = useMemo(() => {
        const allIcons: Array<{ iconName: string; fullIconName: string; IconComponent: any; setName: string; setPath: string }> = []

        iconSets.forEach((set) => {
            const allKeys = Object.keys(set.icons)
            const iconKeys = allKeys.filter((key) => {
                return typeof (set.icons as any)[key] === "function" && key.toLowerCase().includes(searchTerm.toLowerCase())
            })

            iconKeys.forEach((iconName) => {
                allIcons.push({
                    iconName,
                    fullIconName: `${set.path}/${iconName}`,
                    IconComponent: (set.icons as any)[iconName],
                    setName: set.name,
                    setPath: set.path,
                })
            })
        })

        // Limit results for performance
        return allIcons.slice(0, 500)
    }, [searchTerm])

    const getFilteredIconsBySet = (setPrefix: string) => {
        const selectedIconSet = iconSets.find((set) => set.prefix === setPrefix)
        if (!selectedIconSet) return []

        const allKeys = Object.keys(selectedIconSet.icons)
        const iconKeys = allKeys.filter((key) => {
            return typeof (selectedIconSet.icons as any)[key] === "function" && key.toLowerCase().includes(searchTerm.toLowerCase())
        })

        return iconKeys.map((iconName) => ({
            iconName,
            fullIconName: `${selectedIconSet.path}/${iconName}`,
            IconComponent: (selectedIconSet.icons as any)[iconName],
            setName: selectedIconSet.name,
            setPath: selectedIconSet.path,
        }))
    }

    return (
        <div className="w-full">
            <div className="mb-4 space-y-3">
                <Input
                    type="text"
                    placeholder="Search icons across all sets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                />

                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "all" | "bySet")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">All Icons</TabsTrigger>
                        <TabsTrigger value="bySet">By Icon Set</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-4">
                        <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                {getAllFilteredIcons.map((icon) => (
                                    <Button
                                        key={icon.fullIconName}
                                        variant="outline"
                                        className="h-16 w-16 p-2 flex flex-col items-center justify-center gap-1 hover:bg-primary/10"
                                        onClick={() => onSelectIcon(icon.fullIconName)}
                                        title={icon.iconName}
                                    >
                                        <icon.IconComponent size={24} />
                                    </Button>
                                ))}
                            </div>
                            {getAllFilteredIcons.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No icons found matching "{searchTerm}"
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="bySet" className="mt-4">
                        <Tabs defaultValue={iconSets[0].prefix} className="w-full">
                            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                <TabsList className="inline-flex h-10 items-center justify-start rounded-none bg-transparent p-0">
                                    {iconSets.map((set) => (
                                        <TabsTrigger
                                            key={set.prefix}
                                            value={set.prefix}
                                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                                        >
                                            {set.name}
                                            <Badge variant="secondary" className="ml-2">
                                                {getFilteredIconsBySet(set.prefix).length}
                                            </Badge>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </ScrollArea>

                            {iconSets.map((set) => (
                                <TabsContent key={set.prefix} value={set.prefix} className="mt-4">
                                    <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                            {getFilteredIconsBySet(set.prefix).map((icon) => (
                                                <Button
                                                    key={icon.fullIconName}
                                                    variant="outline"
                                                    className="h-16 w-16 p-2 flex flex-col items-center justify-center gap-1 hover:bg-primary/10"
                                                    onClick={() => onSelectIcon(icon.fullIconName)}
                                                    title={icon.iconName}
                                                >
                                                    <icon.IconComponent size={24} />
                                                </Button>
                                            ))}
                                        </div>
                                        {getFilteredIconsBySet(set.prefix).length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No icons found in {set.name} matching "{searchTerm}"
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
