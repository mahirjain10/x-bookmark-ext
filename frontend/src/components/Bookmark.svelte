<script>
    export let bookmark;
    let showMenu = false;
</script>

<div class="p-2 border-b border-[var(--border)] hover:bg-[rgba(30,144,255,0.1)] transition-colors duration-200 relative">
    <div class="flex items-start justify-between">
        <div class="flex items-start gap-2">
            <div class="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"></div>
            <div>
                <div class="font-bold">Bookmark</div>
                <a href={bookmark.url} target="_blank" class="text-[var(--primary)] hover:underline">{bookmark.title}</a>
                <div class="text-xs text-gray-500">{new Date(bookmark.createdAt).toLocaleString()}</div>
            </div>
        </div>
        <span class="menu-btn cursor-pointer text-gray-500 hover:text-[var(--primary)]" on:click|stopPropagation={() => showMenu = !showMenu}>⋯</span>
    </div>
    {#if showMenu}
        <Dropdown options={['Edit', 'Delete']} on:close={() => showMenu = false} />
    {/if}
</div>