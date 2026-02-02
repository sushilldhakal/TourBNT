export const timeAgo = (date: Date | string | null | undefined) => {
    // Handle invalid input
    if (!date) return 'Just now';
    
    // Convert to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Just now';
    
    const now = new Date();
    const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    // Handle future dates or very recent (< 5 seconds)
    if (seconds < 5) return 'Just now';
    if (seconds < 0) return 'Just now'; // Future date
    
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    // Singular/plural forms
    if (seconds < 60) return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
    if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    if (days < 30) return days === 1 ? '1 day ago' : `${days} days ago`;
    if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
    return years === 1 ? '1 year ago' : `${years} years ago`;
};
