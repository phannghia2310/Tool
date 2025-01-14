import ctypes
import threading
import time
import json
from tkinter import Tk, Listbox, Button, Label, Entry, END
from tkinter.filedialog import asksaveasfilename, askopenfilename
from pynput import keyboard

# Windows API
user32 = ctypes.windll.user32

# Các cờ và hằng số Windows
MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_ABSOLUTE = 0x8000
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004

# Biến toàn cục
target_window = None  # HWND của cửa sổ được chọn
click_positions = []  # Danh sách các vị trí click (tọa độ, số lần click, số lần đã click)
running = False  # Trạng thái Auto Click

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", ctypes.c_long),
        ("dy", ctypes.c_long),
        ("mouseData", ctypes.c_ulong),
        ("dwFlags", ctypes.c_ulong),
        ("time", ctypes.c_ulong),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]

class INPUT(ctypes.Structure):
    class _INPUT(ctypes.Union):
        _fields_ = [("mi", MOUSEINPUT)]

    _anonymous_ = ("u",)
    _fields_ = [("type", ctypes.c_ulong), ("u", _INPUT)]

def log_status(message):
    """Hiển thị trạng thái chương trình trên giao diện"""
    status_label.config(text=message)

def get_cursor_position():
    """Lấy vị trí con trỏ chuột hiện tại"""
    class POINT(ctypes.Structure):
        _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

    pt = POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    return pt.x, pt.y

def get_active_window():
    """Lấy HWND và tên cửa sổ hiện tại"""
    hwnd = user32.GetForegroundWindow()
    buffer = ctypes.create_unicode_buffer(512)
    user32.GetWindowTextW(hwnd, buffer, 512)
    return hwnd, buffer.value

def send_mouse_click(x, y):
    """Sử dụng SendInput để thực hiện click chuột tại tọa độ (x, y)"""
    screen_width = user32.GetSystemMetrics(0)
    screen_height = user32.GetSystemMetrics(1)

    abs_x = int(x * 65535 / screen_width)
    abs_y = int(y * 65535 / screen_height)

    inputs = (INPUT * 3)(
        INPUT(type=0, u=INPUT._INPUT(mi=MOUSEINPUT(
            dx=abs_x, dy=abs_y, mouseData=0,
            dwFlags=MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
            time=0, dwExtraInfo=None
        ))),
        INPUT(type=0, u=INPUT._INPUT(mi=MOUSEINPUT(
            dx=0, dy=0, mouseData=0,
            dwFlags=MOUSEEVENTF_LEFTDOWN,
            time=0, dwExtraInfo=None
        ))),
        INPUT(type=0, u=INPUT._INPUT(mi=MOUSEINPUT(
            dx=0, dy=0, mouseData=0,
            dwFlags=MOUSEEVENTF_LEFTUP,
            time=0, dwExtraInfo=None
        )))
    )

    ctypes.windll.user32.SendInput(3, ctypes.byref(inputs), ctypes.sizeof(INPUT))

def update_position_listbox():
    """Cập nhật danh sách hiển thị trong Listbox"""
    position_listbox.delete(0, END)
    for x, y, click_duration, clicked_time in click_positions:
        position_listbox.insert(END, f"({x}, {y}) - Thời gian: {click_duration}s")

def auto_click():
    """Hàm chạy Auto Click"""
    global running, click_positions

    if not click_positions:
        log_status("Chưa có vị trí click.")
        return

    log_status("Auto Click bắt đầu chạy...")
    while running:
        all_done = True  # Kiểm tra nếu tất cả vị trí đã hoàn tất
        for position in click_positions:
            x, y, click_duration, clicked_time = position
            if clicked_time < click_duration:
                all_done = False  # Vẫn còn vị trí chưa hoàn tất
                start_time = time.time()
                while time.time() - start_time < (click_duration - clicked_time):
                    if not running:
                        break
                    send_mouse_click(x, y)
                    time.sleep(0.11)  # Delay giữa các click tại cùng một tọa độ
                position[3] += int(time.time() - start_time)  # Cập nhật thời gian đã click
                update_position_listbox()
                time.sleep(3)  # Dừng 3 giây giữa các tọa độ

        if all_done:  # Nếu tất cả đã hoàn tất, đặt lại và bắt đầu lại
            for position in click_positions:
                position[3] = 0  # Đặt lại thời gian đã click
            update_position_listbox()
            log_status("Hoàn tất một vòng click. Bắt đầu vòng mới...")

def start_auto_click():
    """Bắt đầu Auto Click"""
    global running
    if not running:
        running = True
        threading.Thread(target=auto_click, daemon=True).start()
        log_status("Auto Click đang chạy...")

def stop_auto_click():
    """Dừng Auto Click"""
    global running
    running = False
    log_status("Auto Click đã dừng.")

def add_position():
    """Thêm vị trí con trỏ chuột hiện tại vào danh sách"""
    try:
        x, y = get_cursor_position()
        click_duration = int(click_count_entry.get())
        click_positions.append([x, y, click_duration, 0])  # Thêm [x, y, tổng số lần click, số lần đã click]
        update_position_listbox()
        log_status(f"Đã thêm vị trí: ({x}, {y}) với thời gian click: {click_duration}s")
    except ValueError:
        log_status("Vui lòng nhập số lần click hợp lệ.")

def remove_selected_position():
    """Xóa vị trí được chọn trong danh sách"""
    selected = position_listbox.curselection()
    if selected:
        index = selected[0]
        position_listbox.delete(index)
        removed_position = click_positions.pop(index)
        log_status(f"Đã xóa vị trí: {removed_position}")
    else:
        log_status("Chưa chọn vị trí nào để xóa.")

def select_active_window():
    """Chọn cửa sổ hiện tại"""
    global target_window
    hwnd, title = get_active_window()
    target_window = hwnd
    log_status(f"Đã chọn cửa sổ: {title}")

def save_positions():
    """Lưu danh sách vị trí vào tệp JSON"""
    file_path = asksaveasfilename(defaultextension=".json", filetypes=[("JSON Files", "*.json")])
    if file_path:
        with open(file_path, "w") as file:
            json.dump(click_positions, file)
        log_status(f"Đã lưu vị trí vào tệp: {file_path}")

def load_positions():
    """Tải danh sách vị trí từ tệp JSON"""
    global click_positions
    file_path = askopenfilename(filetypes=[("JSON Files", "*.json")])
    if file_path:
        with open(file_path, "r") as file:
            click_positions = json.load(file)
        update_position_listbox()
        log_status(f"Đã tải vị trí từ tệp: {file_path}")

# GUI
root = Tk()
root.title("Auto Clicker GUI")

# Danh sách các điểm hiển thị trên GUI
position_listbox = Listbox(root, width=50, height=15)
position_listbox.grid(row=1, column=0, columnspan=3, padx=10, pady=10)

# Input số lần click
Label(root, text="Thời gian click (giây):").grid(row=2, column=0, padx=10, pady=5, sticky="e")
click_count_entry = Entry(root, width=5)
click_count_entry.grid(row=2, column=1, padx=10, pady=5)
click_count_entry.insert(0, "1")  # Giá trị mặc định là 1

# GUI Elements
Button(root, text="Thêm vị trí (Page Up)", command=add_position).grid(row=3, column=0, padx=10, pady=5)
Button(root, text="Xóa vị trí đã chọn", command=remove_selected_position).grid(row=3, column=1, padx=10, pady=5)
Button(root, text="Chọn cửa sổ (Home)", command=select_active_window).grid(row=3, column=2, padx=10, pady=5)
Button(root, text="Bắt đầu (End)", command=start_auto_click).grid(row=4, column=0, padx=10, pady=5)
Button(root, text="Dừng Auto Click", command=stop_auto_click).grid(row=4, column=1, columnspan=2, padx=10, pady=5)
Button(root, text="Lưu vị trí", command=save_positions).grid(row=5, column=0, padx=10, pady=5)
Button(root, text="Tải vị trí", command=load_positions).grid(row=5, column=1, padx=10, pady=5)

# Status Label
status_label = Label(root, text="Chương trình sẵn sàng.", fg="green")
status_label.grid(row=6, column=0, columnspan=3, padx=10, pady=10)

# Lắng nghe phím nóng
def keyboard_listener():
    """Lắng nghe sự kiện bàn phím"""
    def on_key_press(key):
        try:
            if key == keyboard.Key.home:
                select_active_window()
            elif key == keyboard.Key.page_up:
                add_position()
            elif key == keyboard.Key.end:
                if running:
                    stop_auto_click()
                else:
                    start_auto_click()
        except Exception as e:
            log_status(f"Lỗi: {e}")

    with keyboard.Listener(on_press=on_key_press) as listener:
        listener.join()

# Chạy listener bàn phím trong một luồng riêng
keyboard_thread = threading.Thread(target=keyboard_listener, daemon=True)
keyboard_thread.start()

# Start GUI loop
root.mainloop()
