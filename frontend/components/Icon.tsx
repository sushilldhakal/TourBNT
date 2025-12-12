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
import { FC, createElement } from 'react';

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

const Icon: FC<IconProps> = ({ name, color, size, className }) => {
    // If no name is provided, return fallback
    if (!name) return <FallbackIcon />;

    try {
        // Set default size if none provided
        const iconSize = size || 24;

        // Handle different icon libraries based on prefix
        // Support both colon and forward slash as separators for flexibility
        if (name.includes(':') || name.includes('/')) {
            // Split using either colon or forward slash
            const [prefix, iconName] = name.includes(':') ?
                name.split(':') :
                name.split('/');

            // React Icons props
            const iconProps = {
                size: iconSize,
                color: color || undefined,
                className: className,
                style: { verticalAlign: 'middle' }
            };

            // Get icon library based on prefix
            const iconLibrary = iconLibraries[prefix as keyof typeof iconLibraries];

            if (iconLibrary && iconName) {
                // Check if icon exists in the library
                const IconComponent = iconLibrary[iconName as keyof typeof iconLibrary];

                if (IconComponent) {
                    // Directly create the icon element
                    return createElement(IconComponent, iconProps);
                }
            }

            // If we couldn't find the icon, return fallback
            return <FallbackIcon />;
        }

        // Handle Lucide icons (no prefix)
        const LucideIcon = icons[name as keyof typeof icons];
        if (LucideIcon) {
            return createElement(LucideIcon, {
                color,
                size: iconSize,
                className
            });
        }

        // If no icon was found, return fallback
        return <FallbackIcon />;
    } catch (error) {
        console.error(`Error rendering icon "${name}":`, error);
        return <FallbackIcon />;
    }
};

export default Icon;
