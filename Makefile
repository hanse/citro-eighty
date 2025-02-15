all: public/favicon.ico public/apple-touch-icon.png public/app-icon-192.png public/app-icon-512.png

public/favicon.ico: app.png
	magick $< -resize 64x64 $@

public/apple-touch-icon.png: app.png
	magick $< -resize 180x180 $@

public/app-icon-192.png: app.png
	magick $< -resize 192x192 $@

public/app-icon-512.png: app.png
	magick $< -resize 512x512 $@

.PHONY: all
