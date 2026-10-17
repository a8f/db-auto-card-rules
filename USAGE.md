# Destiny HERO - Malicious

Import and enable `edison.json` in extension settings first. Ranked Edison,
unrated Edison and Solo Mode are selected by default. Existing watched lists
preserve saved format selections; add Solo Mode under **Loads in** once if needed.

1. Open your graveyard Malicious's card menu and select **Resolve now** for immediate
   resolution, or **Wait for opponent** to wait for a fresh thumbs-up.
2. In your Main Phase, choose **Summon in ATK** or **Summon in DEF**. This declares
   and banishes the source as cost. Both menu modes wait for this position choice;
   a rule with only one legal position can start immediately. Confirm before
   starting that another Malicious is in your Deck and you can legally summon it.
3. In wait mode, after the cost is paid, resolution waits for a fresh opponent thumbs-up. Change
   Attack/Defense Position while waiting, or use **Resolve now** to release manually.
4. The extension searches the Deck, summons another copy in the chosen position
   into the first free monster zone, and closes the search for the native shuffle.

The menu explains unmet phase/format requirements instead of disappearing.
Changing the position while waiting automatically re-arms the fresh thumbs-up wait.
Cancel if negated: the paid cost stays banished. Do not duplicate the operations
manually while automation is running.

Already-held thumbs-up, silence and timeouts are not approval. Thinking, withdrawn
signals and response actions suspend waiting. Handle chains and legality manually.
If interrupted during execution, inspect the completed-step journal and finish
manually. No automatic retry or rollback occurs. Close any remaining Deck search
normally to get Duelingbook's normal shuffle.

# Elemental HERO Stratos

Reload the updated extension and refresh the Duelingbook tab after updating the
engine. Import or watch the updated `edison.json`, then enable the list for your
duel format.

1. After a legal Normal or Special Summon, open your face-up Stratos's card menu
   and choose **Resolve now** for immediate resolution, or **Wait for opponent**
   for the approval flow. Both immediately use native **Declare** and select
   **Search Deck** when available (otherwise destruction).
   There is no timing checkbox or activation-mode step.
   You adjudicate missed timing, Damage Step timing, chains and negation.
2. While declaring or waiting, use **Search Deck** or **Destroy Spells/Traps** to
   change the effect choice. A change restarts the fresh opponent approval wait.
   The choice locks once resolution starts. The panel sends no duel chat messages.
   **Resolve now** releases resolution manually. Cancel if the effect is negated.
3. For search, the normal Deck window shows only eligible Elemental, Destiny or
   Evil HERO monsters. Duplicate copies collapse into one card with a count badge.
   Left-click a card to add it immediately. For an explicit confirmation step,
   enable **Automation → Confirm card selections**; its panel appears near the
   middle of the screen. This option is off by default.
   If the native renderer is unavailable, the panel shows an art-based card grid.
   Native **To hand** reveals it, then closing the Deck triggers
   the site's shuffle. Hero Kid is excluded. Face-up Thunder King Rai-Oh on either
   field prevents search; its negation and other restrictions are manual.
   Before activation, confirm you have a legal matching monster in Deck.
4. For destruction, select up to the displayed number of Spells/Traps. With
   confirmation off, the maximum selection resolves immediately; **Done selecting**
   resolves fewer. With confirmation on, select cards and confirm,
   or choose **Destroy no cards**. The count uses your other face-up Elemental,
   Destiny and Evil HERO monsters at resolution. This effect does not target;
   cards are chosen only at resolution, including face-down Spells/Traps by zone.
5. The selected zones appear in the automation panel. The extension sends your selected cards to
   the Graveyard and waits for the opponent to send theirs. Duelingbook only
   gives a controller native movement controls for their own field cards.

Destruction prevention, replacement effects, changed names, and simultaneous
destruction consequences remain manual. Cancel and resolve manually if ordinary
**To GY** movement would be wrong. Interruption or timeout never retries commands;
check completed movements and finish manually. A source leaving the field after
activation does not by itself prevent the trigger from resolving.
