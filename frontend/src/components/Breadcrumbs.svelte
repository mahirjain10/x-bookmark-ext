<script>
    import { folderStack, currentFolder, forwardStack } from '../stores.js';

    function navigateToFolder(index) {
        const removedFolders = $folderStack.slice(index + 1);
        $forwardStack = removedFolders.reverse().concat($forwardStack);
        $folderStack = $folderStack.slice(0, index + 1);
        $currentFolder = $folderStack[$folderStack.length - 1];
    }
</script>

<div id="breadcrumbs" class="flex-1 flex items-center gap-1.5 text-xs overflow-x-auto whitespace-nowrap">
    {#each $folderStack as folder, index (folder._id)}
        <span class="text-[var(--primary)] cursor-pointer hover:underline" on:click={() => navigateToFolder(index)}>{folder.name}</span>
        {#if index < $folderStack.length - 1}
            <span> / </span>
        {/if}
    {/each}
</div>