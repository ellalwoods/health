/* Astra sync (Supabase). Uses the same Supabase project as Good Word Charlie and DuoDisco, in its own astra_ table.
 * Leave url or key blank to keep everything on each device only.
 * url: the project URL. key: the project's publishable (anon) key. The key is meant to be public:
 *      the database only lets it call astra_load and astra_save (see supabase/astra.sql).
 */
window.ASTRA_CLOUD = window.ASTRA_CLOUD || {
  url: 'https://wyofeftnmuqlagiiwdib.supabase.co',
  key: 'sb_publishable_Ol-pAsFvGOHwu3JNBWt3Pw_UN9t90ho',
};
