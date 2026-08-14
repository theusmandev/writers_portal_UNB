import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({ currentPage, totalPages, onPageChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageChange = (e: React.MouseEvent, page: number) => {
    e.preventDefault();
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }
    
    return pages;
  };

  return (
    <Pagination className="mt-4 pt-4 border-t border-border">
      <PaginationContent className="w-full justify-between sm:justify-center gap-1 sm:gap-2">
        <PaginationItem className="mr-auto sm:mr-4">
          <PaginationPrevious 
            href="#" 
            onClick={(e) => handlePageChange(e, currentPage - 1)}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>

        <div className="hidden sm:flex flex-row items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            const pageNum = page as number;
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink 
                  href="#"
                  onClick={(e) => handlePageChange(e, pageNum)}
                  isActive={currentPage === pageNum}
                  // Override outline to use brand primary if active
                  className={currentPage === pageNum ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "cursor-pointer"}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
        </div>

        {/* Mobile View: Just show "Page X of Y" between arrows */}
        <div className="flex sm:hidden items-center justify-center text-sm font-medium text-muted-foreground px-4">
          Page {currentPage} of {totalPages}
        </div>

        <PaginationItem className="ml-auto sm:ml-4">
          <PaginationNext 
            href="#"
            onClick={(e) => handlePageChange(e, currentPage + 1)}
            className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
