'use client';

import { useState } from 'react';
import { TopHeader } from './TopHeader';
import { MainHeader } from './MainHeader';
import { MenuBarSearch } from '../search/MenuBarSearch';

export function Navigation() {
    const [headerSearch, setHeaderSearch] = useState(false);

    const handleSearch = () => {
        setHeaderSearch(!headerSearch);
    };

    return (
        <div className="relative">
            <TopHeader />
            <MainHeader onSearchToggle={handleSearch} />
            <MenuBarSearch headerSearch={headerSearch} handleSearch={handleSearch} />
        </div>
    );
}
