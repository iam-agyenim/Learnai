

from PIL import Image

def remove_white_and_crop(input_path, output_path, tolerance=60):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        # Check if pixel is close to white (very light color)
        # R, G, B all > 255 - tolerance
        if item[0] > 255 - tolerance and item[1] > 255 - tolerance and item[2] > 255 - tolerance:
            new_data.append((255, 255, 255, 0)) # Transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    
    # Auto-crop to content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save(output_path, "PNG")
    print(f"Saved cropped transparent image to {output_path}")

if __name__ == "__main__":
    # We use the original generated one as source if possible, or the current one
    # Assuming 'public/hand.png' is the source now
    try:
        remove_white_and_crop("public/hand.png", "public/hand_v2.png", tolerance=50)
    except Exception as e:
        print(f"Error: {e}")

