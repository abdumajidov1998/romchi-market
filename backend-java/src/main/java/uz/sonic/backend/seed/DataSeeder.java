package uz.sonic.backend.seed;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import uz.sonic.backend.domain.entity.*;
import uz.sonic.backend.domain.repository.*;

import java.util.List;

/**
 * Mirrors the seed() block from the Node server. Each section is
 * idempotent — only inserts when its target table is empty — so it's
 * safe to leave wired up in prod.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final WorkerRepository workers;
    private final JobRepository jobs;
    private final WasteBuyerRepository wasteBuyers;
    private final UslugaProviderRepository usluga;
    private final StanokMasterRepository stanokMasters;
    private final DeliveryDriverRepository delivery;
    private final InstallBrigadeRepository brigades;
    private final ArkachiRepository arkachilar;
    private final StanokAdRepository stanokAds;
    private final PasswordEncoder bcrypt;

    public DataSeeder(UserRepository users, WorkerRepository workers, JobRepository jobs,
                      WasteBuyerRepository wasteBuyers, UslugaProviderRepository usluga,
                      StanokMasterRepository stanokMasters, DeliveryDriverRepository delivery,
                      InstallBrigadeRepository brigades, ArkachiRepository arkachilar,
                      StanokAdRepository stanokAds, PasswordEncoder bcrypt) {
        this.users = users;
        this.workers = workers;
        this.jobs = jobs;
        this.wasteBuyers = wasteBuyers;
        this.usluga = usluga;
        this.stanokMasters = stanokMasters;
        this.delivery = delivery;
        this.brigades = brigades;
        this.arkachilar = arkachilar;
        this.stanokAds = stanokAds;
        this.bcrypt = bcrypt;
    }

    private static String specsJson(String... names) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < names.length; i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(names[i].replace("\"", "\\\"")).append("\"");
        }
        return sb.append("]").toString();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedWorkersAndJobs();
        seedWasteBuyers();
        seedUslugachilar();
        seedStanokMasters();
        seedDelivery();
        seedInstallBrigades();
        seedArkachilar();
        seedStanokAds();
    }

    private User newUser(String phone, String role) {
        return users.save(User.builder()
                .phone(phone)
                .passwordHash(bcrypt.encode("demo1234"))
                .role(role)
                .build());
    }

    private void seedWorkersAndJobs() {
        if (workers.count() > 0) return;
        record W(String name, String city, String district, String specs, String exp, String about, double r, int jd, int v, int t) {}
        List<W> ws = List.of(
                new W("Sardor Rahimov", "Toshkent", "Yunusobod", specsJson("PVX", "Termo"), "5+ yil", "5 yillik PVX deraza yasash tajribasi. O'z asboblari bor.", 4.9, 87, 1, 1),
                new W("Jamshid Mirzoyev", "Toshkent", "Chilonzor", specsJson("Alyumin"), "3–5 yil", "Alyumin fasad bo'yicha mutaxassis.", 4.6, 34, 0, 0),
                new W("Bekzod Umarov", "Toshkent", "Mirzo Ulug'bek", specsJson("PVX", "Alyumin"), "5+ yil", "7 yillik tajriba, aniq va tez.", 5.0, 142, 1, 1),
                new W("Otabek Yusupov", "Toshkent", "Yashnobod", specsJson("Alyumin", "Termo"), "5+ yil", "Alyumin eshiklar va vitrajli fasadlar.", 4.8, 92, 1, 1)
        );
        for (int i = 0; i < ws.size(); i++) {
            W w = ws.get(i);
            User u = newUser("+99890000000" + (i + 1), "worker");
            workers.save(Worker.builder()
                    .userId(u.getId()).name(w.name()).city(w.city()).district(w.district())
                    .specs(w.specs()).experience(w.exp()).about(w.about())
                    .rating(w.r()).jobsDone(w.jd()).verified(w.v()).top(w.t())
                    .build());
        }

        User employer = newUser("+998900000099", "employer");
        record J(String title, String company, String type, String wt, String city, String district,
                 String exp, int sFrom, int sTo, String specs, String desc, String badge) {}
        List<J> js = List.of(
                new J("PVX deraza yasovchi usta", "Oyna Plast MChJ", "Factory", "Full-time", "Toshkent", "Chilonzor", "3+ yil", 5_000_000, 8_000_000, specsJson("PVX"), "3+ yil tajriba, o'z asboblari kerak.", "New"),
                new J("Alyumin fasad yasovchi usta", "AluTech", "Workshop", "Project", "Toshkent", "Yunusobod", "5+ yil", 9_000_000, 12_000_000, specsJson("Alyumin"), "Shoshilinch loyiha, 6 hafta.", "Top"),
                new J("Termo deraza yasovchi usta", "Doors24", "Factory", "Part-time", "Toshkent", "Mirzo Ulug'bek", "2+ yil", 3_000_000, 5_000_000, specsJson("Termo"), "Termo profil bo'yicha usta.", "Verified")
        );
        for (J j : js) {
            jobs.save(Job.builder()
                    .userId(employer.getId()).title(j.title()).company(j.company())
                    .type(j.type()).workType(j.wt()).city(j.city()).district(j.district())
                    .experience(j.exp()).salaryFrom(j.sFrom()).salaryTo(j.sTo())
                    .specs(j.specs()).description(j.desc()).badge(j.badge())
                    .build());
        }
        log.info("Seeded sample workers and jobs.");
    }

    private void seedWasteBuyers() {
        if (wasteBuyers.count() > 0) return;
        record W(String name, String city, String district, String about, int t, int oq, int rangli, int al, double r, int v, int top) {}
        List<W> ws = List.of(
                new W("Alisher Atxodchi", "Toshkent", "Sergeli", "Barcha turdagi atxodlarni olamiz. Tez va qulay.", 4000, 10000, 5000, 10000, 4.7, 1, 1),
                new W("Dilshod Metall", "Toshkent", "Chilonzor", "Alyumin va PVX atxodlarini yuqori narxda sotib olamiz.", 3500, 9000, 4500, 11000, 4.5, 1, 0),
                new W("Farrux Plast", "Toshkent", "Yunusobod", "PVX atxodlari bo'yicha eng yaxshi narx.", 3000, 12000, 6000, 9000, 4.9, 0, 1)
        );
        for (int i = 0; i < ws.size(); i++) {
            W w = ws.get(i);
            User u = newUser("+99891000000" + (i + 1), "waste_buyer");
            wasteBuyers.save(WasteBuyer.builder()
                    .userId(u.getId()).name(w.name()).city(w.city()).district(w.district()).about(w.about())
                    .priceTermo(w.t()).pricePvxOq(w.oq()).pricePvxRangli(w.rangli()).priceAlyumin(w.al())
                    .rating(w.r()).verified(w.v()).top(w.top())
                    .build());
        }
        log.info("Seeded waste buyers.");
    }

    private void seedUslugachilar() {
        if (usluga.count() > 0) return;
        record U(String name, String city, String district, String specs, String about, int t, int p, int al, int s, int v) {}
        List<U> us = List.of(
                new U("Grand Oyna Sex", "Toshkent", "Sergeli", specsJson("PVX", "Termo", "Surma"), "PVX, Termo va Surma eshiklar ishlab chiqarish. Boshqa sexlar uchun buyurtma qabul qilamiz.", 85000, 120000, 0, 150000, 1),
                new U("AluPro Zavod", "Toshkent", "Chilonzor", specsJson("Alyumin", "Surma"), "Alyumin fasad, vitrazhlar va surma eshiklar. Metr kvadratga ishlaymiz.", 0, 0, 180000, 200000, 1),
                new U("TermoPlast Sex", "Toshkent", "Yunusobod", specsJson("Termo", "PVX", "Alyumin", "Surma"), "Barcha turdagi deraza va eshiklar. Optom narxlarda.", 75000, 110000, 160000, 140000, 0)
        );
        for (int i = 0; i < us.size(); i++) {
            U u = us.get(i);
            User user = newUser("+99892000000" + (i + 1), "usluga");
            usluga.save(UslugaProvider.builder()
                    .userId(user.getId()).name(u.name()).city(u.city()).district(u.district())
                    .about(u.about()).specs(u.specs())
                    .priceTermo(u.t()).pricePvx(u.p()).priceAlyumin(u.al()).priceSurma(u.s())
                    .verified(u.v())
                    .build());
        }
        log.info("Seeded usluga providers.");
    }

    private void seedStanokMasters() {
        if (stanokMasters.count() > 0) return;
        record M(String name, String city, String district, String specs, String about, int diag, int urgent, String exp, int v) {}
        List<M> ms = List.of(
                new M("Anvar Stanok Servis", "Toshkent", "Chilonzor", specsJson("Kesish stanogi", "Frezerlash stanogi"), "Barcha turdagi kesish va frezerlash stanoklarini ta'mirlaymiz. 10 yillik tajriba.", 200000, 1, "5+ yil", 1),
                new M("Rustam Arra Chaxlovchi", "Toshkent", "Sergeli", specsJson("Arra chaxlovchi"), "Diskali, lentali arralarni chaxlaymiz. Sifatli va tez.", 50000, 0, "3-5 yil", 1),
                new M("Bobur Kompressor Servis", "Toshkent", "Yunusobod", specsJson("Kompressor", "Pressovka stanogi"), "Kompressor va press stanoklari bo'yicha mutaxassis.", 150000, 1, "5+ yil", 0),
                new M("Sherzod Universal Usta", "Toshkent", "Yashnobod", specsJson("Kesish stanogi", "Payvandlash stanogi", "Kompressor", "Arra chaxlovchi"), "Barcha turdagi stanoklar. 24/7 chiqaman.", 100000, 1, "5+ yil", 1)
        );
        for (int i = 0; i < ms.size(); i++) {
            M m = ms.get(i);
            User u = newUser("+99893000000" + (i + 1), "stanok");
            stanokMasters.save(StanokMaster.builder()
                    .userId(u.getId()).name(m.name()).city(m.city()).district(m.district())
                    .about(m.about()).specs(m.specs()).priceDiagnostika(m.diag())
                    .urgent(m.urgent()).experience(m.exp()).verified(m.v())
                    .build());
        }
        log.info("Seeded stanok masters.");
    }

    private void seedDelivery() {
        if (delivery.count() > 0) return;
        record D(String name, String city, String district, String vehicle, String about, int v) {}
        List<D> ds = List.of(
                new D("Akmal Damas", "Toshkent", "Chilonzor", "Damas", "Toshkent boylab. Tez va arzon.", 1),
                new D("Bekzod Labo", "Toshkent", "Yashnobod", "Labo", "Yuk tashish, kichik mebellar.", 1),
                new D("Sardor Gazel", "Toshkent", "Sergeli", "Gazel", "Katta yuklar, ko'chish.", 0)
        );
        for (int i = 0; i < ds.size(); i++) {
            D d = ds.get(i);
            User u = newUser("+99893999000" + (i + 1), "delivery");
            delivery.save(DeliveryDriver.builder()
                    .userId(u.getId()).name(d.name()).city(d.city()).district(d.district())
                    .vehicleModel(d.vehicle()).isCustomVehicle(0).about(d.about()).verified(d.v())
                    .build());
        }
        log.info("Seeded delivery drivers.");
    }

    private void seedInstallBrigades() {
        if (brigades.count() > 0) return;
        record B(String name, String city, String district, String specs, int team, String exp, String about, int t, int p, int al, int v) {}
        List<B> bs = List.of(
                new B("Ustanofka Brigada Aziz", "Toshkent", "Yashnobod", specsJson("PVX", "Termo"), 4, "5+ yil", "Tayyor PVX va Termo eshik-derazalarni o'rnatib beramiz. Toshkent bo'ylab.", 35000, 40000, 0, 1),
                new B("Master Romchi Ustanofka", "Toshkent", "Sergeli", specsJson("Alyumin", "PVX"), 3, "3-5 yil", "Alyumin fasad va PVX deraza ustanofkasi. Sifatli, kafolatli.", 0, 38000, 55000, 1),
                new B("Brigada Bekzod", "Toshkent", "Chilonzor", specsJson("Termo", "PVX", "Alyumin"), 5, "5+ yil", "Barcha turdagi rom va eshiklarni o'rnatamiz. Tez va arzon.", 32000, 36000, 50000, 0)
        );
        for (int i = 0; i < bs.size(); i++) {
            B b = bs.get(i);
            User u = newUser("+99894000000" + (i + 1), "install");
            brigades.save(InstallBrigade.builder()
                    .userId(u.getId()).name(b.name()).city(b.city()).district(b.district())
                    .about(b.about()).specs(b.specs()).teamSize(b.team()).experience(b.exp())
                    .priceTermo(b.t()).pricePvx(b.p()).priceAlyumin(b.al()).verified(b.v())
                    .build());
        }
        log.info("Seeded install brigades.");
    }

    private void seedArkachilar() {
        if (arkachilar.count() > 0) return;
        record A(String name, String city, String district, String specs, String exp, String about, int t, int p, int al, int jp, int v) {}
        List<A> as = List.of(
                new A("Arkachi Usta Davron", "Toshkent", "Sergeli", specsJson("PVX", "Termo"), "5+ yil", "PVX va Termo profillarni ark shaklida tayyorlaymiz. Tez va sifatli.", 30000, 28000, 0, 0, 1),
                new A("Master Ark Sex", "Toshkent", "Chilonzor", specsJson("Alyumin", "JP fasad", "PVX"), "3-5 yil", "Alyumin va JP fasad arklari. Har xil radius.", 0, 30000, 45000, 55000, 1),
                new A("Ustaxona Arka Pro", "Toshkent", "Yashnobod", specsJson("Termo", "PVX", "Alyumin", "JP fasad"), "5+ yil", "Barcha turdagi profillar uchun ark egish xizmati.", 28000, 26000, 42000, 52000, 0)
        );
        for (int i = 0; i < as.size(); i++) {
            A a = as.get(i);
            User u = newUser("+99895000000" + (i + 1), "arkachi");
            arkachilar.save(Arkachi.builder()
                    .userId(u.getId()).name(a.name()).city(a.city()).district(a.district())
                    .about(a.about()).specs(a.specs()).experience(a.exp())
                    .priceTermo(a.t()).pricePvx(a.p()).priceAlyumin(a.al()).priceJpFasad(a.jp())
                    .verified(a.v())
                    .build());
        }
        log.info("Seeded arkachilar.");
    }

    private void seedStanokAds() {
        if (stanokAds.count() > 0) return;
        Long sellerId = users.findAll().stream()
                .filter(u -> "stanok".equals(u.getRole()))
                .map(User::getId)
                .findFirst().orElse(null);
        if (sellerId == null) return;
        record Ad(String title, String type, String cond, int price, String desc, String city, String district) {}
        List<Ad> ads = List.of(
                new Ad("Yangi Frezerlash stanogi (Toshkent)", "Frezerlash stanogi", "new", 25_000_000, "Yangi, kafolat bilan. CNC boshqaruvi.", "Toshkent", "Chilonzor"),
                new Ad("Ishlatilgan Kompressor 200L", "Kompressor", "used", 4_500_000, "3 yil ishlatilgan, holati a'lo. Sertifikat bor.", "Toshkent", "Yashnobod"),
                new Ad("Pressovka stanogi 50 tonna", "Pressovka stanogi", "used", 18_000_000, "Sanoat uchun. Toshkent shahri.", "Toshkent", "Sergeli")
        );
        for (Ad ad : ads) {
            stanokAds.save(StanokAd.builder()
                    .userId(sellerId).title(ad.title()).stanokType(ad.type()).condition(ad.cond())
                    .price(ad.price()).description(ad.desc()).city(ad.city()).district(ad.district())
                    .verified(1)
                    .build());
        }
        log.info("Seeded stanok ads.");
    }
}
