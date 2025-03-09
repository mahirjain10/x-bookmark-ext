<script>
    import { onMount } from 'svelte';
    import { fetchFolders, createFolder, folderData, currentFolder, folderStack, forwardStack, isDarkMode, showBookmarkInput, showFolderInput, searchQuery, searchFilter } from './stores.js';
    import Breadcrumbs from './components/Breadcrumbs.svelte';
    import Folder from './components/Folder.svelte';
    import Bookmark from './components/Bookmark.svelte';

    let bookmarkTitle = '';
    let bookmarkUrl = '';
    let folderName = '';

    onMount(() => {
        fetchFolders();
    });

    function toggleDarkMode() {
        $isDarkMode = !$isDarkMode;
    }

    function addBookmark() {
        if (bookmarkTitle && bookmarkUrl) {
            const newBookmark = {
                _id: "bm" + Date.now(),
                title: bookmarkTitle,
                url: bookmarkUrl,
                createdAt: new Date().toISOString()
            };
            $currentFolder.bookmarks.push(newBookmark);
            $currentFolder = $currentFolder; // Trigger reactivity
            bookmarkTitle = '';
            bookmarkUrl = '';
            $showBookmarkInput = false;
        }
    }

    function addFolder() {
        if (folderName) {
            createFolder(folderName);
            folderName = '';
            $showFolderInput = false;
        }
    }

    function goBack() {
        if ($folderStack.length > 1) {
            $forwardStack.unshift($folderStack.pop());
            $currentFolder = $folderStack[$folderStack.length - 1];
        }
    }

    function goForward() {
        if ($forwardStack.length > 0) {
            const nextFolder = $forwardStack.shift();
            $folderStack.push(nextFolder);
            $currentFolder = nextFolder;
        }
    }
</script>

<main class="font-sans bg-[var(--bg)] text-[var(--text)] w-[350px] min-h-[400px] m-0 p-0 overflow-y-auto text-sm transition-all duration-300 box-border" class:dark={$isDarkMode} class:light={!$isDarkMode}>
    <div class="p-3">
        <div class="flex justify-between items-center mb-2">
            <h1 class="text-lg font-bold">X Bookmarks</h1>
            <div class="flex gap-2">
                <button id="mode-btn" class="flex items-center gap-1 px-2 py-1 bg-[var(--primary)] text-white rounded cursor-pointer text-xs min-w-6" on:click={toggleDarkMode}>
                    <span id="mode-icon">{$isDarkMode ? '☀️' : '🌙'}</span>
                    {$isDarkMode ? 'Light' : 'Dark'}
                </button>
                <span class="text-xs text-gray-500">Mar 06, 2025</span>
            </div>
        </div>

        <div class="flex flex-col gap-2 mb-2">
            <input type="text" id="search-bar" class="w-full p-1.5 border border-[var(--border)] rounded box-border" placeholder="Search bookmarks..." bind:value={$searchQuery}>
            <select id="search-filter" class="w-full p-1.5 border border-[var(--border)] rounded box-border text-xs" bind:value={$searchFilter}>
                <option value="all">All</option>
                <option value="folders">Folders</option>
                <option value="bookmarks">Bookmarks</option>
            </select>
        </div>

        <div class="flex gap-2 mb-2">
            <button id="add-bookmark-btn" class="px-2 py-1 bg-[var(--primary)] text-white rounded cursor-pointer text-xs" on:click={() => $showBookmarkInput = true}>Add Bookmark</button>
            <button id="add-folder-btn" class="px-2 py-1 bg-[var(--primary)] text-white rounded cursor-pointer text-xs" on:click={() => $showFolderInput = true}>Add Folder</button>
        </div>

        {#if $showBookmarkInput}
            <div id="bookmark-input-container" class="mb-2">
                <input type="text" id="bookmark-title" class="w-full p-1.5 border border-[var(--border)] rounded mb-2 box-border" placeholder="Title" bind:value={bookmarkTitle}>
                <input type="text" id="bookmark-url" class="w-full p-1.5 border border-[var(--border)] rounded mb-2 box-border" placeholder="URL" bind:value={bookmarkUrl}>
                <button id="submit-bookmark" class="px-2 py-1 bg-[var(--primary)] text-white rounded cursor-pointer text-xs" on:click={addBookmark}>Save</button>
            </div>
        {/if}

        {#if $showFolderInput}
            <div id="folder-input-container" class="mb-2">
                <input type="text" id="folder-name" class="w-full p-1.5 border border-[var(--border)] rounded mb-2 box-border" placeholder="Folder Name" bind:value={folderName}>
                <button id="submit-folder" class="px-2 py-1 bg-[var(--primary)] text-white rounded cursor-pointer text-xs" on:click={addFolder}>Save</button>
            </div>
        {/if}

        <div class="flex items-center gap-2 mb-2">
            <button id="back-btn" class="px-2 py-1 bg-[var(--primary)] text-white rounded cursor-pointer text-xs min-w-6 disabled:bg-[var(--border)] disabled:cursor-not-allowed" disabled={$folderStack.length === 1} on:click={goBack}><-</button>
            <button id="forward-btn" class="px-2 py-1 bg-[var(--primary)] text-white rounded cursor-pointer text-xs min-w-6 disabled:bg-[var(--border)] disabled:cursor-not-allowed" disabled={$forwardStack.length === 0} on:click={goForward}>-></button>
            <Breadcrumbs />
        </div>

        <div id="content-list" class="space-y-1">
            {#if $currentFolder}
                {#each ($currentFolder.subFolders || []).filter(folder => !$searchQuery || $searchFilter !== 'bookmarks' && folder.name.toLowerCase().includes($searchQuery.toLowerCase())) as folder (folder._id)}
                    <Folder {folder} />
                {/each}
                {#each $currentFolder.bookmarks.filter(bm => !$searchQuery || $searchFilter !== 'folders' && bm.title.toLowerCase().includes($searchQuery.toLowerCase())) as bookmark (bookmark._id)}
                    <Bookmark {bookmark} />
                {/each}
            {/if}
        </div>
    </div>
</main>

<style>
    :global(:root) {
        --primary: #1e90ff;
        --primary-dark: #104e8b;
        --background-light: #f7f9fc;
        --background-dark: #1a2236;
        --text-light: #2d3748;
        --text-dark: #e2e8f0;
        --card-light: #ffffff;
        --card-dark: #2d3748;
        --border-light: #e2e8f0;
        --border-dark: #4a5568;
    }

    :global(.light) {
        --bg: var(--background-light);
        --text: var(--text-light);
        --card: var(--card-light);
        --border: var(--border-light);
    }

    :global(.dark) {
        --bg: var(--background-dark);
        --text: var(--text-dark);
        --card: var(--card-dark);
        --border: var(--border-dark);
    }
</style>