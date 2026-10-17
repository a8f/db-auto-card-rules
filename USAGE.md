# Destiny HERO - Malicious

Import and enable `edison.json` in extension settings first. Edison duel formats
are selected by default; Solo Mode must be explicitly selected for Solo testing.

1. Open your graveyard Malicious's card menu and select **Automate effect…**.
2. In your Main Phase, choose Attack or Defense Position, then **Declare & banish**.
   Confirm that another Malicious is in your Deck and you can legally summon it.
3. After the cost is paid, choose **Resolve now** when the effect resolves, or
   **Wait for opponent** to release it on a fresh native opponent thumbs-up.
4. The extension searches the Deck, summons another copy in the chosen position
   into the first free monster zone, and closes the search for the native shuffle.

The menu explains unmet phase/format requirements instead of disappearing.
Changing the position while waiting requires a fresh explicit resolution release.
Cancel if negated: the paid cost stays banished. Do not duplicate the operations
manually while automation is running.

Already-held thumbs-up, silence and timeouts are not approval. Thinking, withdrawn
signals and response actions suspend waiting. Handle chains and legality manually.
If interrupted during execution, inspect the completed-step journal and finish
manually. No automatic retry or rollback occurs. Close any remaining Deck search
normally to get Duelingbook's normal shuffle.
