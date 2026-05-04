package uz.sonic.backend.storage;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import uz.sonic.backend.config.AppProperties;
import uz.sonic.backend.web.error.ApiException;

import java.io.IOException;
import java.nio.file.*;
import java.security.SecureRandom;
import java.util.Locale;

@Service
public class FileStorage {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5MB
    private static final SecureRandom RNG = new SecureRandom();

    private final AppProperties props;
    private Path root;

    public FileStorage(AppProperties props) {
        this.props = props;
    }

    @PostConstruct
    public void init() throws IOException {
        root = Paths.get(props.upload().dir()).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    /** Saves the given image file under /uploads and returns its public path (e.g. "/uploads/abc.jpg"). */
    public String saveImage(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) {
            throw ApiException.badRequest("Faqat rasm fayllari qabul qilinadi");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw ApiException.badRequest("Rasm hajmi 5MB dan oshmasin");
        }
        String orig = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = "";
        int dot = orig.lastIndexOf('.');
        if (dot >= 0) {
            ext = orig.substring(dot).toLowerCase(Locale.ROOT).replaceAll("[^.a-z0-9]", "");
        }
        if (ext.isEmpty()) ext = ".jpg";
        String name = System.currentTimeMillis() + "-" + Long.toString(Math.abs(RNG.nextLong()), 36).substring(0, 6) + ext;
        Path dest = root.resolve(name);
        try {
            file.transferTo(dest);
        } catch (IOException e) {
            throw ApiException.badRequest("Yuklash xatosi: " + e.getMessage());
        }
        return "/uploads/" + name;
    }

    /** Deletes a previously stored upload by its public path; ignores anything outside /uploads. */
    public void deleteIfManaged(String publicPath) {
        if (publicPath == null || !publicPath.startsWith("/uploads/")) return;
        try {
            Path target = root.resolve(publicPath.substring("/uploads/".length())).normalize();
            if (target.startsWith(root)) Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }
}
