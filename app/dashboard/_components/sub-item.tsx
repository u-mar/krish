'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import NewBadge from './NewBadge';

const SidebarItem = ({ item }: { item: any }) => {
  const { name, path, icon: Icon, subItems, new: isNew } = item; // Handle subItems and new property
  const pathname = usePathname();
  const isActive = useMemo(() => path === pathname, [path, pathname]);

  const [isOpen, setIsOpen] = useState(false); // State to manage sub-items visibility

  const handleToggle = () => {
    if (subItems) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      {/* If the item has no sub-items, it's a regular link */}
      {!subItems ? (
        <Link href={path} className="relative">
          <div
            className={`text-sm py-2 px-4 flex items-center rounded-lg cursor-pointer transition-all ${
              isActive
                ? 'bg-[#1A1A1A] text-green-500'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {Icon && <Icon size={18} className="mr-4" />} {/* Icon for the item */}
            <div className="flex items-center">
              {name}
              {isNew && <NewBadge />}
            </div>
            {isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
            )}
          </div>
        </Link>
      ) : (
        // If the item has sub-items, it toggles them on click
        <>
          <div
            className={`relative text-sm py-2 px-4 flex items-center rounded-lg cursor-pointer transition-all ${
              isOpen ? 'text-green-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
            onClick={handleToggle}
          >
            {Icon && <Icon size={18} className="mr-4" />}
            <div className="flex items-center">
              {name}
              {(isNew || subItems.some((item: any) => item.new)) && <NewBadge />}
            </div>
            <span className="ml-auto">
              {isOpen ? (
                <ChevronDown size={16} className="text-gray-400" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </span>
          </div>

          {/* Render sub-items if open */}
          {isOpen && (
            <div className="flex flex-col space-y-1 ml-6">
              {subItems.map((subItem: any, idx: number) => (
                <Link href={subItem.path} key={idx}>
                  <div
                    className={`text-sm py-2 px-4 flex items-center rounded-lg cursor-pointer transition-all ${
                      pathname === subItem.path
                        ? 'bg-[#1A1A1A] text-green-500'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      {subItem.name}
                      {subItem.new && <NewBadge />}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default SidebarItem;
