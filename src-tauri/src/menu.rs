use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::AppHandle;

pub fn build(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let settings = MenuItemBuilder::with_id("settings", "Settings…")
        .accelerator("CmdOrCtrl+Comma").build(app)?;
    let app_menu = SubmenuBuilder::new(app, "Kata")
        .item(&PredefinedMenuItem::about(app, None, None)?)
        .separator()
        .item(&settings)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let new_game = MenuItemBuilder::with_id("new-game", "New Game…")
        .accelerator("CmdOrCtrl+N").build(app)?;
    let open = MenuItemBuilder::with_id("open", "Open SGF…")
        .accelerator("CmdOrCtrl+O").build(app)?;
    let save = MenuItemBuilder::with_id("save", "Save")
        .accelerator("CmdOrCtrl+S").build(app)?;
    let save_as = MenuItemBuilder::with_id("save-as", "Save As…")
        .accelerator("CmdOrCtrl+Shift+S").build(app)?;
    let file = SubmenuBuilder::new(app, "File")
        .item(&new_game).item(&open).separator().item(&save).item(&save_as)
        .separator().item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let undo = MenuItemBuilder::with_id("previous", "Previous Move")
        .accelerator("CmdOrCtrl+Z").build(app)?;
    let redo = MenuItemBuilder::with_id("next", "Next Move")
        .accelerator("CmdOrCtrl+Shift+Z").build(app)?;
    let edit = SubmenuBuilder::new(app, "Edit")
        .item(&undo).item(&redo).build()?;

    let variations = MenuItemBuilder::with_id("variations", "Show Variations")
        .accelerator("CmdOrCtrl+B").build(app)?;
    let analysis = MenuItemBuilder::with_id("analysis", "Toggle Analysis")
        .accelerator("Space").build(app)?;
    let view = SubmenuBuilder::new(app, "View")
        .item(&variations).item(&analysis).build()?;

    MenuBuilder::new(app).item(&app_menu).item(&file).item(&edit).item(&view).build()
}
