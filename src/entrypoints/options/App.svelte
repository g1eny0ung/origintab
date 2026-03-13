<script lang="ts">
  import { onMount } from "svelte";
  import { Settings, Info, RotateCcw, MousePointerClick } from "@lucide/svelte";
  import type { ClickAction } from "~/utils/types";

  // Settings state
  let autoOpenOnStartup = $state(true);
  let confirmBeforeDelete = $state(true);
  let clickAction = $state<ClickAction>("saveAll");
  let isLoading = $state(true);

  // Load settings on mount
  onMount(() => {
    loadSettings();
  });

  async function loadSettings() {
    try {
      const [autoOpen, confirmDelete, action] = await Promise.all([
        storage.getItem<boolean>("local:autoOpenOnStartup"),
        storage.getItem<boolean>("local:confirmBeforeDelete"),
        storage.getItem<ClickAction>("local:clickAction"),
      ]);

      autoOpenOnStartup = autoOpen !== false; // default true
      confirmBeforeDelete = confirmDelete !== false; // default true
      clickAction = action ?? "saveAll"; // default 'saveAll'
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      isLoading = false;
    }
  }

  async function saveSetting(key: string, value: boolean | string) {
    try {
      await storage.setItem(`local:${key}`, value);
    } catch (error) {
      console.error("Failed to save setting:", error);
    }
  }

  function handleAutoOpenChange(e: Event) {
    const target = e.target as HTMLInputElement;
    autoOpenOnStartup = target.checked;
    saveSetting("autoOpenOnStartup", autoOpenOnStartup);
  }

  function handleConfirmDeleteChange(e: Event) {
    const target = e.target as HTMLInputElement;
    confirmBeforeDelete = target.checked;
    saveSetting("confirmBeforeDelete", confirmBeforeDelete);
  }

  function handleClickActionChange(action: ClickAction) {
    clickAction = action;
    saveSetting("clickAction", action);
  }

  async function resetSettings() {
    if (confirm("Reset all settings to default?")) {
      autoOpenOnStartup = true;
      confirmBeforeDelete = true;
      clickAction = "saveAll";
      await Promise.all([
        storage.setItem("local:autoOpenOnStartup", true),
        storage.setItem("local:confirmBeforeDelete", true),
        storage.setItem("local:clickAction", "saveAll"),
      ]);
    }
  }
</script>

<div class="min-h-screen">
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <Settings size={26} aria-hidden="true" />
        <div>
          <h1 class="text-xl font-bold">Settings</h1>
          <p class="text-sm text-base-content/60">
            Customize OriginTab behavior
          </p>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm gap-2" onclick={resetSettings}>
        <RotateCcw size={16} aria-hidden="true" />
        Reset
      </button>
    </div>

    {#if isLoading}
      <div class="flex justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    {:else}
      <!-- Settings List -->
      <div class="space-y-4">
        <!-- Auto-open on startup -->
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium">Auto-open on Startup</h3>
                <p class="text-sm text-base-content/60">
                  Automatically open OriginTab when browser starts
                </p>
              </div>
              <input
                type="checkbox"
                class="toggle toggle-primary"
                checked={autoOpenOnStartup}
                onchange={handleAutoOpenChange}
                aria-label="Auto-open on Startup"
              />
            </div>
          </div>
        </div>

        <!-- Confirm before delete -->
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-medium">Confirm before delete</h3>
                <p class="text-sm text-base-content/60">
                  Show confirmation dialog when deleting tabs or groups
                </p>
              </div>
              <input
                type="checkbox"
                class="toggle toggle-primary"
                checked={confirmBeforeDelete}
                onchange={handleConfirmDeleteChange}
                aria-label="Confirm before delete"
              />
            </div>
          </div>
        </div>

        <!-- Icon Click Action -->
        <div class="card bg-base-100 shadow-sm border border-base-300">
          <div class="card-body">
            <div class="flex items-center gap-2 mb-4">
              <MousePointerClick size={18} aria-hidden="true" />
              <h3 class="font-medium">Icon Click Action</h3>
            </div>
            <p class="text-sm text-base-content/60 mb-4">
              Choose what happens when you click the extension icon
            </p>
            <div class="space-y-2">
              <label
                class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
                for="clickAction-saveAll"
              >
                <input
                  type="radio"
                  name="clickAction"
                  id="clickAction-saveAll"
                  class="radio radio-primary"
                  value="saveAll"
                  checked={clickAction === "saveAll"}
                  onchange={() => handleClickActionChange("saveAll")}
                />
                <div>
                  <div class="font-medium">Save All Tabs</div>
                  <div class="text-sm text-base-content/60">
                    Save all tabs in current window to OriginTab
                  </div>
                </div>
              </label>
              <label
                class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
                for="clickAction-saveCurrent"
              >
                <input
                  type="radio"
                  name="clickAction"
                  id="clickAction-saveCurrent"
                  class="radio radio-primary"
                  value="saveCurrent"
                  checked={clickAction === "saveCurrent"}
                  onchange={() => handleClickActionChange("saveCurrent")}
                />
                <div>
                  <div class="font-medium">Save Current Tab Only</div>
                  <div class="text-sm text-base-content/60">
                    Save only the currently active tab to OriginTab
                  </div>
                </div>
              </label>
              <label
                class="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 cursor-pointer transition-colors"
                for="clickAction-showPopup"
              >
                <input
                  type="radio"
                  name="clickAction"
                  id="clickAction-showPopup"
                  class="radio radio-primary"
                  value="showPopup"
                  checked={clickAction === "showPopup"}
                  onchange={() => handleClickActionChange("showPopup")}
                />
                <div>
                  <div class="font-medium">Show Popup Menu</div>
                  <div class="text-sm text-base-content/60">
                    Open a popup with options
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- About Section -->
        <div class="card bg-base-100 shadow-sm border border-base-300 mt-8">
          <div class="card-body">
            <div class="flex items-center gap-2 mb-4">
              <Info size={18} aria-hidden="true" />
              <h3 class="font-medium">About OriginTab</h3>
            </div>
            <div class="space-y-2 text-sm text-base-content/60">
              <p>
                <span class="font-medium text-base-content">Version:</span> 1.0.0
              </p>
              <p>Save tabs with one click and restore them at any time.</p>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
