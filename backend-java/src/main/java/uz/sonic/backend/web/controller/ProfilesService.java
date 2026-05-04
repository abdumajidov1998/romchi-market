package uz.sonic.backend.web.controller;

import org.springframework.stereotype.Service;
import uz.sonic.backend.domain.repository.*;
import uz.sonic.backend.web.mapper.Mappers;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ProfilesService {

    private final WorkerRepository workers;
    private final WasteBuyerRepository wasteBuyers;
    private final UslugaProviderRepository usluga;
    private final StanokMasterRepository stanok;
    private final DeliveryDriverRepository delivery;
    private final InstallBrigadeRepository installBrigades;
    private final ArkachiRepository arkachilar;
    private final Mappers mappers;

    public ProfilesService(WorkerRepository workers, WasteBuyerRepository wasteBuyers,
                           UslugaProviderRepository usluga, StanokMasterRepository stanok,
                           DeliveryDriverRepository delivery, InstallBrigadeRepository installBrigades,
                           ArkachiRepository arkachilar, Mappers mappers) {
        this.workers = workers;
        this.wasteBuyers = wasteBuyers;
        this.usluga = usluga;
        this.stanok = stanok;
        this.delivery = delivery;
        this.installBrigades = installBrigades;
        this.arkachilar = arkachilar;
        this.mappers = mappers;
    }

    public Map<String, Object> collect(Long userId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("worker", workers.findByUserId(userId).map(w -> mappers.worker(w, null)).orElse(null));
        body.put("wasteBuyer", wasteBuyers.findByUserId(userId).map(w -> mappers.wasteBuyer(w, null)).orElse(null));
        body.put("usluga", usluga.findByUserId(userId).map(u -> mappers.usluga(u, null)).orElse(null));
        body.put("stanok", stanok.findByUserId(userId).map(s -> mappers.stanok(s, null)).orElse(null));
        body.put("delivery", delivery.findByUserId(userId).map(d -> mappers.delivery(d, null)).orElse(null));
        body.put("installBrigada", installBrigades.findByUserId(userId).map(b -> mappers.installBrigade(b, null)).orElse(null));
        body.put("arkachi", arkachilar.findByUserId(userId).map(a -> mappers.arkachi(a, null)).orElse(null));
        return body;
    }
}
