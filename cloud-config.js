/* Astra sync (Supabase). Uses the same Supabase project as DuoVino, in its own astra_ table.
 * Leave url or key blank to keep everything on each device only.
 * url: the project URL. key: the project's publishable (anon) key. The key is meant to be public:
 *      the database only lets it call astra_load and astra_save (see supabase/astra.sql).
 */
window.ASTRA_CLOUD = window.ASTRA_CLOUD || {
  url: 'https://qjmefypqidheyuzkrlqu.supabase.co',
  key: 'sb_publishable__QoKgDZSuerubzX-TOEh2A_bBLSsmwc',
};
