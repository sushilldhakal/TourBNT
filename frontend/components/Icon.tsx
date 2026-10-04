'use client';

import { icons } from 'lucide-react';
import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as BiIcons from 'react-icons/bi';
import * as BsIcons from 'react-icons/bs';
import * as FiIcons from 'react-icons/fi';
import * as MdIcons from 'react-icons/md';
import * as IoIcons from 'react-icons/io';
import * as Io5Icons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as TiIcons from 'react-icons/ti';
import * as GiIcons from 'react-icons/gi';
import * as WiIcons from 'react-icons/wi';
import * as DiIcons from 'react-icons/di';
import * as SiIcons from 'react-icons/si';
import * as VscIcons from 'react-icons/vsc';
import * as CgIcons from 'react-icons/cg';
import * as HiIcons from 'react-icons/hi';
import * as Hi2Icons from 'react-icons/hi2';
import * as GrIcons from 'react-icons/gr';
import * as LuIcons from 'react-icons/lu';
import * as TbIcons from 'react-icons/tb';
import { FC, createElement, type ComponentType } from 'react';

interface IconProps {
    name: string;
    color?: string;
    size?: number | string;
    className?: string;
}

// Fallback icon to display when an icon can't be found
const FallbackIcon = () => (
    <div
        style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #ccc',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#666'
        }}
    >
        icon
    </div>
);

// Create a map of all icon libraries for easier access
const iconLibraries = {
    fa: FaIcons,
    ai: AiIcons,
    bs: BsIcons,
    fi: FiIcons,
    md: MdIcons,
    io: IoIcons,
    io5: Io5Icons,
    ri: RiIcons,
    ti: TiIcons,
    gi: GiIcons,
    wi: WiIcons,
    di: DiIcons,
    si: SiIcons,
    vsc: VscIcons,
    cg: CgIcons,
    hi: HiIcons,
    hi2: Hi2Icons,
    bi: BiIcons,
    gr: GrIcons,
    lu: LuIcons,
    tb: TbIcons
};

/** The icon component for a name like "fa:FaHiking", "fa/FaHiking" or a Lucide name; null if unknown. */
function resolveIcon(name: string): { component: ComponentType<Record<string, unknown>>; lucide: boolean } | null {
    // Support both colon and forward slash as separators for flexibility
    if (name.includes(':') || name.includes('/')) {
        const [prefix, iconName] = name.includes(':') ? name.split(':') : name.split('/');
        const iconLibrary = iconLibraries[prefix as keyof typeof iconLibraries];
        if (!iconLibrary || !iconName) return null;
        const component = iconLibrary[iconName as keyof typeof iconLibrary] as ComponentType<Record<string, unknown>> | undefined;
        return component ? { component, lucide: false } : null;
    }
    const lucideIcon = icons[name as keyof typeof icons] as ComponentType<Record<string, unknown>> | undefined;
    return lucideIcon ? { component: lucideIcon, lucide: true } : null;
}

const Icon: FC<IconProps> = ({ name, color, size, className }) => {
    const resolved = name ? resolveIcon(name) : null;
    if (!resolved) return <FallbackIcon />;

    const iconSize = size || 24;
    return resolved.lucide
        ? createElement(resolved.component, { color, size: iconSize, className })
        : createElement(resolved.component, {
            size: iconSize,
            color: color || undefined,
            className,
            style: { verticalAlign: 'middle' },
        });
};

export default Icon;
